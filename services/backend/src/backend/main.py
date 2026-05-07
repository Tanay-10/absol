"""FastAPI application — insurance early-warning backend."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import db
from backend.db_init import init_database
from backend.routers import alerts, dashboard, events, pipeline


async def _polling_loop():
    import asyncio
    import httpx
    await asyncio.sleep(10)
    while True:
        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    "http://127.0.0.1:8001/api/pipeline/run",
                    timeout=120.0
                )
            print(f"[polling_loop] pipeline run complete: {r.status_code}")
        except Exception as e:
            print(f"[polling_loop] error: {e}")
        await asyncio.sleep(300)  # 30s for testing, change to 300 for demo

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await init_database(db)
    import asyncio
    task = asyncio.create_task(_polling_loop())
    yield
    task.cancel()
    await db.close()


app = FastAPI(
    title="InsureShield API",
    description="Insurance early-warning backend — geo-matching, claims, alerts",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
