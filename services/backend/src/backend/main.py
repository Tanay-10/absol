"""FastAPI application — insurance early-warning backend."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import alerts, dashboard, events, pipeline

app = FastAPI(
    title="InsureShield API",
    description="Insurance early-warning backend — geo-matching, claims, alerts",
    version="0.1.0",
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
