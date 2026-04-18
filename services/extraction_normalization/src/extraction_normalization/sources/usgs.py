"""USGS Earthquake Hazards Program GeoJSON feed adapter."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx

from extraction_normalization.config import FETCH_TIMEOUT_SECONDS, USGS_API_URL
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


class USGSSource(BaseSource):
    """Fetches M2.5+ earthquakes from the USGS GeoJSON feed."""

    @property
    def name(self) -> str:
        return "usgs"

    async def fetch_raw(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            resp = await client.get(USGS_API_URL)
            resp.raise_for_status()
            data = resp.json()
        return data.get("features", [])

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        props = raw.get("properties", {})
        geom = raw.get("geometry", {})
        coords = geom.get("coordinates", [0, 0, 0])

        eid = raw.get("id", "")
        if not eid:
            return None

        mag = props.get("mag")
        alert = props.get("alert")  # green/yellow/orange/red or None

        return CanonicalEvent(
            canonical_id=f"usgs:{eid}",
            source="usgs",
            source_event_id=str(eid),
            event_family=EventFamily.NATURAL,
            event_type=EventType.EARTHQUAKE,
            event_subtype=props.get("magType"),
            title=props.get("title", f"M{mag} Earthquake"),
            summary=props.get("place"),
            severity_label=_usgs_severity_label(mag, alert),
            severity_score=_usgs_severity_score(mag, alert),
            status=EventStatus.ACTIVE if props.get("status") != "deleted" else EventStatus.ENDED,
            confidence=None,
            occurred_at=_epoch_ms_to_dt(props.get("time")),
            updated_at=_epoch_ms_to_dt(props.get("updated")),
            geometry_type=GeometryType.POINT,
            latitude=coords[1],
            longitude=coords[0],
            country_codes=[],
            severity_inputs=SeverityInputs(
                magnitude=mag,
                alert_level=alert,
            ),
            source_url=props.get("url"),
            raw_payload_ref=None,
        )


# ── Private helpers ──────────────────────────────────────────────────────────


def _epoch_ms_to_dt(epoch_ms: int | None) -> datetime | None:
    if epoch_ms is None:
        return None
    return datetime.fromtimestamp(epoch_ms / 1000, tz=UTC)


_ALERT_SEVERITY: dict[str | None, int] = {
    "red": 4,
    "orange": 3,
    "yellow": 2,
    "green": 1,
    None: 0,
}


def _usgs_severity_label(mag: float | None, alert: str | None) -> SeverityLabel:
    if mag is None:
        return SeverityLabel.MODERATE
    if mag >= 7.0 or alert == "red":
        return SeverityLabel.CRITICAL
    if mag >= 6.0 or alert == "orange":
        return SeverityLabel.SEVERE
    if mag >= 5.0 or alert == "yellow":
        return SeverityLabel.MAJOR
    if mag >= 4.0:
        return SeverityLabel.MODERATE
    return SeverityLabel.MINOR


def _usgs_severity_score(mag: float | None, alert: str | None) -> int:
    if mag is None:
        return 50
    # Base score from magnitude (0–10 scale mapped to 0–80)
    base = min(int(mag * 10), 80)
    # Alert bonus (0–20)
    bonus = _ALERT_SEVERITY.get(alert, 0) * 5
    return min(base + bonus, 100)
