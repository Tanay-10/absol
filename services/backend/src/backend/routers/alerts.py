"""Alert endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.database import db

router = APIRouter(tags=["alerts"])


@router.get("/alerts")
async def list_alerts(
    level: str | None = Query(None),
    limit: int = Query(50, le=200),
):
    conditions: list[str] = []
    params: list = []
    if level:
        conditions.append("alert_level = ?")
        params.append(level)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(limit)

    alerts = await db.fetch_all(
        f"SELECT * FROM alerts {where} ORDER BY generated_at DESC LIMIT ?",
        tuple(params),
    )

    # Enrich with event data
    for alert in alerts:
        event = await db.fetch_one(
            "SELECT id, canonical_id, event_type, title, severity_label, severity_score, "
            "latitude, longitude, region_name FROM events WHERE id = ?",
            (alert["event_id"],),
        )
        alert["events"] = event

    return alerts
