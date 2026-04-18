"""Alert endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.supabase import SupabaseClient

router = APIRouter(tags=["alerts"])
db = SupabaseClient()


@router.get("/alerts")
async def list_alerts(
    level: str | None = Query(None),
    limit: int = Query(50, le=200),
):
    params: dict[str, str] = {"order": "generated_at.desc", "limit": str(limit)}
    if level:
        params["alert_level"] = f"eq.{level}"

    alerts = await db.select(
        "alerts",
        params=params,
        columns="*,events(id,canonical_id,event_type,title,severity_label,severity_score,latitude,longitude,region_name)",
    )
    return alerts
