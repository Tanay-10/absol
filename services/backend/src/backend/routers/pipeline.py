"""Pipeline orchestration endpoint."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from fastapi import APIRouter

from backend.config import EXTRACTION_SERVICE_PATH
from backend.database import db
from backend.services.alert_generator import generate_alert
from backend.services.claim_estimator import estimate_claim
from backend.services.geo_matcher import find_matches

router = APIRouter(tags=["pipeline"])


async def _run_extraction() -> str:
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
    event_id = event["id"]

    zone = await db.fetch_one(
        "SELECT * FROM impact_zones WHERE event_id = ?", (event_id,)
    )
    if not zone:
        return {"event_id": event_id, "status": "no_impact_zone"}

    locations = await db.fetch_all(
        "SELECT id, policy_id, latitude, longitude, country_code FROM insured_locations"
    )
    policies = await db.fetch_all(
        "SELECT id, policy_type, coverage_amount, covered_perils FROM policies WHERE status = 'active'"
    )

    raw_matches = find_matches(zone, locations, policies, event)
    if not raw_matches:
        return {"event_id": event_id, "status": "no_matches", "matches": 0}

    for m in raw_matches:
        m["event_id"] = event_id
    db_matches = await db.upsert(
        "exposure_matches", raw_matches,
        conflict_columns=["event_id", "policy_id", "location_id"],
    )

    relevance_rows = await db.fetch_all(
        "SELECT * FROM event_policy_relevance WHERE event_type = ?",
        (event["event_type"],),
    )
    relevance_map = {r["policy_type"]: r for r in relevance_rows}

    policy_map = {p["id"]: p for p in policies}
    estimates = []
    for m in db_matches:
        policy = policy_map.get(m["policy_id"], {})
        rel = relevance_map.get(
            policy.get("policy_type"),
            {"base_claim_rate": 0.1, "severity_multiplier": 1.0},
        )
        est = estimate_claim(m, policy, rel, event, zone)
        est["exposure_match_id"] = m["id"]
        estimates.append(est)

    if estimates:
        await db.upsert(
            "claim_estimates", estimates,
            conflict_columns=["exposure_match_id"],
        )

    alert_data = generate_alert(estimates, total_policies=len(db_matches))
    alert_data["event_id"] = event_id
    await db.upsert("alerts", [alert_data], conflict_columns=["event_id"])

    return {
        "event_id": event_id,
        "status": "processed",
        "matches": len(db_matches),
        "claims_estimated": len(estimates),
        "alert_level": alert_data["alert_level"],
    }


@router.post("/pipeline/run")
async def run_pipeline():
    extraction_output = await _run_extraction()

    events = await db.fetch_all(
        "SELECT * FROM events ORDER BY detected_at DESC LIMIT 100"
    )

    results = []
    for event in events:
        try:
            result = await _process_event(event)
            results.append(result)
        except Exception as e:
            results.append({"event_id": event["id"], "status": "error", "error": str(e)})

    processed = sum(1 for r in results if r.get("status") == "processed")
    return {
        "extraction_output": extraction_output[-500:],
        "events_found": len(events),
        "events_processed": processed,
        "results": results,
    }
