"""NASA EONET (Earth Observatory Natural Event Tracker) v3 adapter."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from extraction_normalization.config import EONET_API_URL, FETCH_TIMEOUT_SECONDS
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventStatus,
    EventType,
    GeometryType,
    SeverityInputs,
    SeverityLabel,
)
from extraction_normalization.sources.base import BaseSource

# EONET category IDs → canonical EventType
_EONET_CATEGORY_MAP: dict[str, EventType] = {
    "earthquakes": EventType.EARTHQUAKE,
    "floods": EventType.FLOOD,
    "wildfires": EventType.WILDFIRE,
    "volcanoes": EventType.VOLCANO,
    "severeStorms": EventType.STORM,
    "drought": EventType.DROUGHT,
    "landslides": EventType.OTHER,
    "manmade": EventType.INDUSTRIAL,
    "seaLakeIce": EventType.OTHER,
    "snow": EventType.STORM,
    "tempExtremes": EventType.OTHER,
    "waterColor": EventType.OTHER,
    "dustHaze": EventType.OTHER,
}


class EONETSource(BaseSource):
    """Fetches natural events from NASA EONET v3."""

    @property
    def name(self) -> str:
        return "eonet"

    async def fetch_raw(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                EONET_API_URL,
                params={"limit": 100, "status": "open"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("events", [])

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        eid = raw.get("id", "")
        if not eid:
            return None

        categories = raw.get("categories", [])
        cat_id = categories[0]["id"] if categories else "other"
        event_type = _EONET_CATEGORY_MAP.get(cat_id, EventType.OTHER)
        event_family = EventFamily.HUMAN_CAUSED if cat_id == "manmade" else EventFamily.NATURAL

        # Use the most recent geometry entry
        geometry_list = raw.get("geometry", [])
        if not geometry_list:
            return None
        latest_geom = geometry_list[-1]
        coords = latest_geom.get("coordinates", [0, 0])

        sources = raw.get("sources", [])
        source_url = sources[0].get("url") if sources else None

        mag_value = latest_geom.get("magnitudeValue")
        mag_unit = latest_geom.get("magnitudeUnit")

        return CanonicalEvent(
            canonical_id=f"eonet:{eid}",
            source="eonet",
            source_event_id=str(eid),
            event_family=event_family,
            event_type=event_type,
            event_subtype=cat_id,
            title=raw.get("title", f"EONET {cat_id} event"),
            summary=raw.get("description"),
            severity_label=_eonet_severity_label(event_type, mag_value),
            severity_score=_eonet_severity_score(event_type, mag_value),
            status=EventStatus.ACTIVE if raw.get("closed") is None else EventStatus.ENDED,
            confidence=None,
            occurred_at=_parse_iso(latest_geom.get("date")),
            geometry_type=GeometryType.POINT,
            latitude=coords[1] if len(coords) >= 2 else None,
            longitude=coords[0] if len(coords) >= 2 else None,
            country_codes=[],
            severity_inputs=SeverityInputs(
                magnitude=mag_value,
                alert_level=mag_unit,
            ),
            source_url=source_url,
            raw_payload_ref=None,
        )


# ── Private helpers ──────────────────────────────────────────────────────────


def _parse_iso(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _eonet_severity_label(event_type: EventType, magnitude: float | None) -> SeverityLabel:
    """Best-effort severity from EONET magnitude (varies by event type)."""
    if magnitude is None:
        return SeverityLabel.MODERATE
    if event_type == EventType.WILDFIRE:
        # magnitude in acres
        if magnitude > 100_000:
            return SeverityLabel.CRITICAL
        if magnitude > 10_000:
            return SeverityLabel.SEVERE
        if magnitude > 1_000:
            return SeverityLabel.MAJOR
        if magnitude > 100:
            return SeverityLabel.MODERATE
        return SeverityLabel.MINOR
    if event_type == EventType.EARTHQUAKE:
        if magnitude >= 7.0:
            return SeverityLabel.CRITICAL
        if magnitude >= 6.0:
            return SeverityLabel.SEVERE
        if magnitude >= 5.0:
            return SeverityLabel.MAJOR
        return SeverityLabel.MODERATE
    return SeverityLabel.MODERATE


def _eonet_severity_score(event_type: EventType, magnitude: float | None) -> int:
    if magnitude is None:
        return 50
    if event_type == EventType.WILDFIRE:
        import math
        return min(int(math.log10(max(magnitude, 1)) * 20), 100)
    if event_type == EventType.EARTHQUAKE:
        return min(int(magnitude * 12), 100)
    return 50
