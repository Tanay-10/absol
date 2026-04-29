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

@router.get("/dashboard/latency")
async def dashboard_latency():
    # Use detected_at as fallback if first_seen_at column doesn't exist yet
    try:
        rows = await db.fetch_all("""
            SELECT
                e.id            AS event_id,
                e.title,
                e.event_type,
                e.severity_label,
                COALESCE(e.first_seen_at, e.detected_at) AS first_seen_at,
                e.detected_at,
                e.occurred_at,
                a.generated_at  AS alert_generated_at,
                a.alert_level,
                a.estimated_claim_count,
                ROUND(
                    ABS(julianday(a.generated_at) - julianday(COALESCE(e.first_seen_at, e.detected_at))) * 24 * 60,
                    1
                ) AS latency_minutes
            FROM events e
            JOIN alerts a ON a.event_id = e.id
            WHERE a.generated_at IS NOT NULL
            ORDER BY e.detected_at DESC
            LIMIT 50
        """)
    except Exception as e:
        return {
            "events": [],
            "summary": {
                "avg_latency_minutes": None,
                "min_latency_minutes": None,
                "max_latency_minutes": None,
                "within_2h_pct": None,
                "total_events": 0,
            },
            "error": str(e),
        }

    if not rows:
        return {
            "events": [],
            "summary": {
                "avg_latency_minutes": None,
                "min_latency_minutes": None,
                "max_latency_minutes": None,
                "within_2h_pct": None,
                "total_events": 0,
            },
        }

    latencies = [r["latency_minutes"] for r in rows if r["latency_minutes"] is not None]
    within_2h = sum(1 for m in latencies if m <= 120)
    within_2h_pct = round(100 * within_2h / len(latencies), 1) if latencies else None

    return {
        "events": [dict(r) for r in rows],
        "summary": {
            "avg_latency_minutes": round(sum(latencies) / len(latencies), 1) if latencies else None,
            "min_latency_minutes": min(latencies) if latencies else None,
            "max_latency_minutes": max(latencies) if latencies else None,
            "within_2h_pct": within_2h_pct,
            "total_events": len(rows),
        },
    }