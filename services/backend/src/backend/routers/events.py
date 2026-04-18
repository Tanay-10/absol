"""Event endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.supabase import SupabaseClient

router = APIRouter(tags=["events"])
db = SupabaseClient()


@router.get("/events")
async def list_events(
    event_type: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(50, le=200),
):
    params: dict[str, str] = {"order": "detected_at.desc", "limit": str(limit)}
    if event_type:
        params["event_type"] = f"eq.{event_type}"
    if severity:
        params["severity_label"] = f"eq.{severity}"
    return await db.select("events", params=params)


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    rows = await db.select("events", params={"id": f"eq.{event_id}"})
    if not rows:
        raise HTTPException(404, "Event not found")
    event = rows[0]

    # Fetch related data
    zones = await db.select("impact_zones", params={"event_id": f"eq.{event_id}"})
    matches = await db.select(
        "exposure_matches",
        params={"event_id": f"eq.{event_id}"},
        columns="*,policies(*,policyholders(*)),insured_locations(*)",
    )
    estimates = await db.select(
        "claim_estimates",
        params={"exposure_match_id": f"in.({','.join(m['id'] for m in matches)})"}
    ) if matches else []
    alerts_data = await db.select("alerts", params={"event_id": f"eq.{event_id}"})

    return {
        "event": event,
        "impact_zone": zones[0] if zones else None,
        "matches": matches,
        "estimates": estimates,
        "alert": alerts_data[0] if alerts_data else None,
    }
