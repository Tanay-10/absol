"""Dashboard summary endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from backend.supabase import SupabaseClient

router = APIRouter(tags=["dashboard"])
db = SupabaseClient()


@router.get("/dashboard/summary")
async def dashboard_summary():
    events = await db.select("events", columns="id", params={"limit": "10000"})
    alerts = await db.select("alerts", columns="id,alert_level,estimated_claim_count,estimated_total_amount", params={"limit": "10000"})
    policies = await db.select("policies", columns="id", params={"limit": "10000"})
    matches = await db.select("exposure_matches", columns="id", params={"limit": "10000"})

    active_alerts = [a for a in alerts if a.get("alert_level") in ("high", "critical")]

    return {
        "total_events": len(events),
        "total_alerts": len(alerts),
        "active_alerts": len(active_alerts),
        "total_policies": len(policies),
        "total_matches": len(matches),
        "estimated_claims": sum(a.get("estimated_claim_count", 0) for a in alerts),
        "estimated_total_amount": sum(float(a.get("estimated_total_amount", 0)) for a in alerts),
        "alert_breakdown": {
            "low": sum(1 for a in alerts if a.get("alert_level") == "low"),
            "medium": sum(1 for a in alerts if a.get("alert_level") == "medium"),
            "high": sum(1 for a in alerts if a.get("alert_level") == "high"),
            "critical": sum(1 for a in alerts if a.get("alert_level") == "critical"),
        },
    }
