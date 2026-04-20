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

    # For "point" zones, use the event's lat/lon as the center
    center_lat = zone.get("center_lat") or event.get("latitude")
    center_lon = zone.get("center_lon") or event.get("longitude")

    for loc in locations:
        policy = policy_map.get(loc["policy_id"])
        if not policy:
            continue

        covered = policy.get("covered_perils", [])
        if event_type not in covered:
            continue

        distance_km = None
        match_method = None

        if zone["zone_type"] in ("radius", "point"):
            if center_lat is None or center_lon is None:
                continue
            d = haversine_km(
                center_lat, center_lon,
                loc["latitude"], loc["longitude"],
            )
            if d > zone["radius_km"]:
                continue
            distance_km = round(d, 2)
            match_method = "radius"

        elif zone["zone_type"] == "bbox":
            bbox = zone.get("bbox") or zone.get("bbox_json")
            if isinstance(bbox, str):
                import json
                bbox = json.loads(bbox)
            if not bbox or not point_in_bbox(loc["latitude"], loc["longitude"], bbox):
                continue
            match_method = "bbox_overlap"

        elif zone["zone_type"] == "admin_area":
            admin = zone.get("admin_regions") or zone.get("country_code")
            if isinstance(admin, str):
                import json
                try:
                    admin = json.loads(admin)
                except (json.JSONDecodeError, ValueError):
                    admin = [admin]
            if isinstance(admin, list):
                if loc.get("country_code") not in admin:
                    continue
            elif loc.get("country_code") != admin:
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
