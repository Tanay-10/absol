"""GDACS (Global Disaster Alert and Coordination System) adapter."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from extraction_normalization.config import FETCH_TIMEOUT_SECONDS, GDACS_API_URL
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventStatus,
    EventType,
    GeometryType,
    SeverityInputs,
    SeverityLabel,
)
from extraction_normalization.normalize.event_type_map import map_event_type
from extraction_normalization.sources.base import BaseSource

# GDACS event type codes → our canonical types
_GDACS_TYPE_MAP: dict[str, str] = {
    "EQ": "earthquake",
    "TC": "cyclone",
    "FL": "flood",
    "VO": "volcano",
    "WF": "wildfire",
    "DR": "drought",
    "TSU": "tsunami",
}


class GDACSSource(BaseSource):
    """Fetches multi-hazard events from the GDACS API."""

    @property
    def name(self) -> str:
        return "gdacs"

    async def fetch_raw(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            resp = await client.get(
                GDACS_API_URL,
                params={
                    "eventlist": "EQ,TC,FL,VO,WF,DR",
                    "alertlevel": "Green;Orange;Red",
                    "limit": 100,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("features", [])

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        props = raw.get("properties", {})
        geom = raw.get("geometry", {})
        coords = geom.get("coordinates", [0, 0])
        bbox_raw = raw.get("bbox")

        eid = str(props.get("eventid", ""))
        if not eid:
            return None

        raw_type = props.get("eventtype", "")
        mapped_type_str = _GDACS_TYPE_MAP.get(raw_type, raw_type)
        mapped = map_event_type(mapped_type_str)

        alert_level = props.get("alertlevel", "Green")
        severity_data = props.get("severitydata", {})

        # Determine geometry type
        has_real_bbox = (
            bbox_raw
            and len(bbox_raw) == 4
            and not (bbox_raw[0] == bbox_raw[2] and bbox_raw[1] == bbox_raw[3])
        )

        affected = props.get("affectedcountries", [])
        country_codes = [c.get("iso3", "") for c in affected if c.get("iso3")]

        return CanonicalEvent(
            canonical_id=f"gdacs:{eid}",
            source="gdacs",
            source_event_id=eid,
            event_family=mapped.event_family,
            event_type=mapped.event_type,
            event_subtype=raw_type,
            title=props.get("name", f"GDACS {raw_type} event"),
            summary=props.get("description") or props.get("htmldescription"),
            severity_label=_gdacs_alert_to_label(alert_level),
            severity_score=_gdacs_severity_score(alert_level, severity_data),
            status=EventStatus.ACTIVE if props.get("iscurrent", "").lower() == "true" else EventStatus.ENDED,
            confidence=None,
            occurred_at=_parse_gdacs_date(props.get("fromdate")),
            updated_at=_parse_gdacs_date(props.get("datemodified")),
            geometry_type=GeometryType.BBOX if has_real_bbox else GeometryType.POINT,
            latitude=coords[1] if len(coords) >= 2 else None,
            longitude=coords[0] if len(coords) >= 2 else None,
            bbox=bbox_raw if has_real_bbox else None,
            region_name=props.get("country"),
            country_codes=country_codes,
            severity_inputs=SeverityInputs(
                magnitude=severity_data.get("severity"),
                alert_level=alert_level,
            ),
            source_url=props.get("url", {}).get("report") if isinstance(props.get("url"), dict) else None,
            raw_payload_ref=None,
        )


# ── Private helpers ──────────────────────────────────────────────────────────


def _parse_gdacs_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


_ALERT_LABEL_MAP: dict[str, SeverityLabel] = {
    "Red": SeverityLabel.CRITICAL,
    "Orange": SeverityLabel.MAJOR,
    "Green": SeverityLabel.MINOR,
}


def _gdacs_alert_to_label(alert: str) -> SeverityLabel:
    return _ALERT_LABEL_MAP.get(alert, SeverityLabel.MODERATE)


def _gdacs_severity_score(alert: str, severity_data: dict) -> int:
    base = {"Red": 80, "Orange": 55, "Green": 25}.get(alert, 40)
    sev = severity_data.get("severity")
    if sev and isinstance(sev, (int, float)) and sev > 0:
        # Small bonus for high raw severity values
        bonus = min(int(sev), 20)
        return min(base + bonus, 100)
    return base
