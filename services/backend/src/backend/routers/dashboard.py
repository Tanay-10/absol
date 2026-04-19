"""Dashboard summary endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from backend.database import db

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary")
async def dashboard_summary():
    counts = await db.fetch_one("""
        SELECT
            (SELECT COUNT(*) FROM events) AS total_events,
            (SELECT COUNT(*) FROM alerts) AS total_alerts,
            (SELECT COUNT(*) FROM alerts WHERE alert_level IN ('high', 'critical')) AS active_alerts,
            (SELECT COUNT(*) FROM policies) AS total_policies,
            (SELECT COUNT(*) FROM exposure_matches) AS total_matches,
            (SELECT COALESCE(SUM(estimated_claim_count), 0) FROM alerts) AS estimated_claims,
            (SELECT COALESCE(SUM(estimated_total_amount), 0) FROM alerts) AS estimated_total_amount
    """)

    breakdown = await db.fetch_one("""
        SELECT
            COALESCE(SUM(CASE WHEN alert_level = 'low' THEN 1 ELSE 0 END), 0) AS low,
            COALESCE(SUM(CASE WHEN alert_level = 'medium' THEN 1 ELSE 0 END), 0) AS medium,
            COALESCE(SUM(CASE WHEN alert_level = 'high' THEN 1 ELSE 0 END), 0) AS high,
            COALESCE(SUM(CASE WHEN alert_level = 'critical' THEN 1 ELSE 0 END), 0) AS critical
        FROM alerts
    """)

    return {
        "total_events": counts["total_events"],
        "total_alerts": counts["total_alerts"],
        "active_alerts": counts["active_alerts"],
        "total_policies": counts["total_policies"],
        "total_matches": counts["total_matches"],
        "estimated_claims": counts["estimated_claims"],
        "estimated_total_amount": float(counts["estimated_total_amount"]),
        "alert_breakdown": {
            "low": breakdown["low"],
            "medium": breakdown["medium"],
            "high": breakdown["high"],
            "critical": breakdown["critical"],
        },
    }
