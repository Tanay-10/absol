"""Geo-matching service — finds insured locations within an event's impact zone."""
from __future__ import annotations

from backend.services.geo import haversine_km, point_in_bbox


def find_matches(
    zone: dict,
    locations: list[dict],
    policies: list[dict],
    event: dict,
) -> list[dict]:
    """Find insured locations within the impact zone that cover the event's peril.

    Returns a list of match dicts ready for insertion into exposure_matches.
    """
    policy_map = {p["id"]: p for p in policies}
    event_type = event["event_type"]
    matches = []

    for loc in locations:
        policy = policy_map.get(loc["policy_id"])
        if not policy:
            continue

        covered = policy.get("covered_perils", [])
        if event_type not in covered:
            continue

        distance_km = None
        match_method = None

        if zone["zone_type"] == "radius":
            d = haversine_km(
                zone["center_lat"], zone["center_lon"],
                loc["latitude"], loc["longitude"],
            )
            if d > zone["radius_km"]:
                continue
            distance_km = round(d, 2)
            match_method = "radius"

        elif zone["zone_type"] == "bbox":
            if not point_in_bbox(loc["latitude"], loc["longitude"], zone["bbox"]):
                continue
            match_method = "bbox_overlap"

        elif zone["zone_type"] == "admin_area":
            if loc.get("country_code") != zone.get("country_code"):
                continue
            match_method = "admin_match"

        else:
            continue

        matches.append({
            "event_id": None,  # filled by caller with DB uuid
            "policy_id": loc["policy_id"],
            "location_id": loc["id"],
            "distance_km": distance_km,
            "match_method": match_method,
        })

    return matches
