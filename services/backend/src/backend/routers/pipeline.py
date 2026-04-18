"""Pipeline orchestration endpoint."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from fastapi import APIRouter

from backend.config import EXTRACTION_SERVICE_PATH
from backend.services.alert_generator import generate_alert
from backend.services.claim_estimator import estimate_claim
from backend.services.geo_matcher import find_matches
from backend.supabase import SupabaseClient

router = APIRouter(tags=["pipeline"])
db = SupabaseClient()


async def _run_extraction() -> str:
    """Run the extraction pipeline as a subprocess."""
    service_path = Path(EXTRACTION_SERVICE_PATH)
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "extraction_normalization.main", "--db", "--no-artifacts",
        cwd=str(service_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return stdout.decode() + stderr.decode()


async def _process_event(event: dict) -> dict:
    """Run geo-matching, claim estimation, and alert generation for one event."""
    event_id = event["id"]

    # Get impact zone
    zones = await db.select("impact_zones", params={"event_id": f"eq.{event_id}"})
    if not zones:
        return {"event_id": event_id, "status": "no_impact_zone"}
    zone = zones[0]

    # Get all insured locations and policies
    locations = await db.select("insured_locations", columns="id,policy_id,latitude,longitude,country_code")
    policies = await db.select("policies", columns="id,policy_type,coverage_amount,covered_perils")

    # Geo-match
    raw_matches = find_matches(zone, locations, policies, event)
    if not raw_matches:
        return {"event_id": event_id, "status": "no_matches", "matches": 0}

    # Assign event_id and upsert matches
    for m in raw_matches:
        m["event_id"] = event_id
    db_matches = await db.upsert(
        "exposure_matches", raw_matches, on_conflict="event_id,policy_id,location_id"
    )

    # Get relevance rules
    relevance_rows = await db.select(
        "event_policy_relevance",
        params={"event_type": f"eq.{event['event_type']}"},
    )
    relevance_map = {r["policy_type"]: r for r in relevance_rows}

    # Estimate claims
    policy_map = {p["id"]: p for p in policies}
    estimates = []
    for m in db_matches:
        policy = policy_map.get(m["policy_id"], {})
        rel = relevance_map.get(policy.get("policy_type"), {
            "base_claim_rate": 0.1, "severity_multiplier": 1.0
        })
        est = estimate_claim(m, policy, rel, event, zone)
        est["exposure_match_id"] = m["id"]
        estimates.append(est)

    if estimates:
        await db.upsert("claim_estimates", estimates, on_conflict="exposure_match_id")

    # Generate alert
    alert_data = generate_alert(estimates, total_policies=len(db_matches))
    alert_data["event_id"] = event_id
    await db.upsert("alerts", [alert_data], on_conflict="event_id")

    return {
        "event_id": event_id,
        "status": "processed",
        "matches": len(db_matches),
        "claims_estimated": len(estimates),
        "alert_level": alert_data["alert_level"],
    }


@router.post("/pipeline/run")
async def run_pipeline():
    # Step 1: Run extraction
    extraction_output = await _run_extraction()

    # Step 2: Get all events
    events = await db.select("events", params={"order": "detected_at.desc", "limit": "100"})

    # Step 3: Process each event
    results = []
    for event in events:
        try:
            result = await _process_event(event)
            results.append(result)
        except Exception as e:
            results.append({"event_id": event["id"], "status": "error", "error": str(e)})

    processed = sum(1 for r in results if r.get("status") == "processed")
    return {
        "extraction_output": extraction_output[-500:],  # last 500 chars
        "events_found": len(events),
        "events_processed": processed,
        "results": results,
    }
