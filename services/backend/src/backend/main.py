"""FastAPI application — insurance early-warning backend."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import db
from backend.db_init import init_database
from backend.routers import alerts, dashboard, events, pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    await init_database(db)
    yield
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
