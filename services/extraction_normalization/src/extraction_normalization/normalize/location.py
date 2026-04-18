"""Location normalization — graceful degradation from point → bbox → admin area."""

from __future__ import annotations

import math

from extraction_normalization.models.canonical_event import CanonicalEvent, GeometryType


def normalize_location(event: CanonicalEvent) -> CanonicalEvent:
    """Ensure the event has the best geometry_type given its available fields.

    This is a post-normalization pass: source adapters set what they can,
    and this function promotes or degrades the geometry type to match reality.
    """
    has_point = event.latitude is not None and event.longitude is not None
    has_bbox = event.bbox is not None and len(event.bbox) == 4
    has_admin = bool(event.region_name or event.country_codes)

    if has_point:
        if event.geometry_type != GeometryType.BBOX:
            return event.model_copy(update={"geometry_type": GeometryType.POINT})
        return event
    if has_bbox:
        return event.model_copy(update={"geometry_type": GeometryType.BBOX})
    if has_admin:
        return event.model_copy(update={"geometry_type": GeometryType.ADMIN_AREA})
    # No usable location — keep whatever the adapter set
    return event


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bbox_overlaps(a: list[float], b: list[float]) -> bool:
    """Check if two [min_lat, min_lon, max_lat, max_lon] bboxes overlap."""
    if len(a) != 4 or len(b) != 4:
        return False
    return not (a[2] < b[0] or b[2] < a[0] or a[3] < b[1] or b[3] < a[1])
