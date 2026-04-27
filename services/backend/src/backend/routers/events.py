"""Event endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.database import db

router = APIRouter(tags=["events"])


@router.get("/events")
async def list_events(
    event_type: str | None = Query(None),
    severity: str | None = Query(None),
    is_mobile: bool | None = Query(None),
    limit: int = Query(50, le=200),
):
    conditions: list[str] = []
    params: list = []
    if event_type:
        conditions.append("event_type = ?")
        params.append(event_type)
    if severity:
        conditions.append("severity_label = ?")
        params.append(severity)
    if is_mobile is not None:
        conditions.append("is_mobile = ?")
        params.append(1 if is_mobile else 0)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(limit)
    return await db.fetch_all(
        f"SELECT * FROM events {where} ORDER BY detected_at DESC LIMIT ?",
        tuple(params),
    )


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.fetch_one("SELECT * FROM events WHERE id = ?", (event_id,))
    if not event:
        raise HTTPException(404, "Event not found")

    zone = await db.fetch_one(
        "SELECT * FROM impact_zones WHERE event_id = ?", (event_id,)
    )

    matches = await db.fetch_all(
        "SELECT * FROM exposure_matches WHERE event_id = ?", (event_id,)
    )

    # Enrich matches with policy, policyholder, and location data
    for match in matches:
        policy = await db.fetch_one("SELECT * FROM policies WHERE id = ?", (match["policy_id"],))
        if policy:
            holder = await db.fetch_one(
                "SELECT * FROM policyholders WHERE id = ?", (policy["policyholder_id"],)
            )
            policy["policyholders"] = holder
            match["policies"] = policy
        location = await db.fetch_one(
            "SELECT * FROM insured_locations WHERE id = ?", (match["location_id"],)
        )
        match["insured_locations"] = location

    # Fetch claim estimates for these matches
    estimates = []
    if matches:
        match_ids = [m["id"] for m in matches]
        placeholders = ", ".join("?" * len(match_ids))
        estimates = await db.fetch_all(
            f"SELECT * FROM claim_estimates WHERE exposure_match_id IN ({placeholders})",
            tuple(match_ids),
        )

    alert = await db.fetch_one(
        "SELECT * FROM alerts WHERE event_id = ?", (event_id,)
    )

    return {
        "event": event,
        "impact_zone": zone,
        "matches": matches,
        "estimates": estimates,
        "alert": alert,
    }
