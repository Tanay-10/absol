"""Supabase PostgREST client — upserts events and impact zones into the database."""

from __future__ import annotations

import httpx

from extraction_normalization.config import (
    FETCH_TIMEOUT_SECONDS,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
)
from extraction_normalization.models.canonical_event import CanonicalEvent


# Base radius (km) by event type for impact zone computation
_BASE_RADIUS: dict[str, float] = {
    "earthquake": 50,
    "flood": 100,
    "wildfire": 30,
    "cyclone": 100,
    "storm": 100,
    "tornado": 20,
    "tsunami": 150,
    "volcano": 40,
    "drought": 200,
    "conflict": 50,
    "terrorism": 10,
    "industrial": 15,
    "other": 50,
}


def event_to_row(event: CanonicalEvent) -> dict:
    """Map a CanonicalEvent to a dict matching the events table columns."""
    return {
        "canonical_id": event.canonical_id,
        "source": event.source,
        "event_family": event.event_family.value,
        "event_type": event.event_type.value,
        "event_subtype": event.event_subtype,
        "title": event.title,
        "summary": event.summary,
        "severity_label": event.severity_label.value,
        "severity_score": event.severity_score,
        "status": event.status.value,
        "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
        "detected_at": event.detected_at.isoformat(),
        "geometry_type": event.geometry_type.value,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "bbox": event.bbox,
        "region_name": event.region_name,
        "country_codes": event.country_codes,
        "severity_inputs": event.severity_inputs.model_dump(),
        "source_url": event.source_url,
        "schema_version": event.schema_version,
    }


def compute_impact_zone(event: CanonicalEvent) -> dict:
    """Derive an impact_zones row from an event's geometry and severity."""
    geo = event.geometry_type.value

    if geo == "point":
        base = _BASE_RADIUS.get(event.event_type.value, 50)
        radius = round(base * (1 + event.severity_score / 50), 2)
        return {
            "zone_type": "radius",
            "center_lat": event.latitude,
            "center_lon": event.longitude,
            "radius_km": radius,
            "bbox": None,
            "admin_region": None,
            "country_code": event.country_codes[0] if event.country_codes else None,
        }
    elif geo == "bbox":
        return {
            "zone_type": "bbox",
            "center_lat": None,
            "center_lon": None,
            "radius_km": None,
            "bbox": event.bbox,
            "admin_region": None,
            "country_code": event.country_codes[0] if event.country_codes else None,
        }
    else:
        # admin_area or polygon → admin_area zone
        return {
            "zone_type": "admin_area",
            "center_lat": event.latitude,
            "center_lon": event.longitude,
            "radius_km": None,
            "bbox": None,
            "admin_region": event.region_name,
            "country_code": event.country_codes[0] if event.country_codes else None,
        }


class SupabaseClient:
    """Upserts normalized events into Supabase via PostgREST."""

    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
    ) -> None:
        self.url = (url or SUPABASE_URL).rstrip("/")
        self.key = key or SUPABASE_ANON_KEY

    def _headers(self, *, upsert: bool = False) -> dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if upsert:
            h["Prefer"] = "resolution=merge-duplicates,return=representation"
        else:
            h["Prefer"] = "return=representation"
        return h

    async def _upsert_events(
        self, client: httpx.AsyncClient, events: list[CanonicalEvent]
    ) -> list[dict]:
        """Upsert event rows, return the inserted rows with server-generated ids."""
        rows = [event_to_row(e) for e in events]
        resp = await client.post(
            f"{self.url}/rest/v1/events",
            json=rows,
            headers=self._headers(upsert=True),
            params={"on_conflict": "canonical_id"},
        )
        resp.raise_for_status()
        return resp.json()

    async def _insert_impact_zones(
        self,
        client: httpx.AsyncClient,
        events: list[CanonicalEvent],
        db_rows: list[dict],
    ) -> None:
        """Compute and insert impact zones for each event."""
        # Build canonical_id → db uuid mapping
        id_map = {r["canonical_id"]: r["id"] for r in db_rows}

        zones = []
        for event in events:
            db_id = id_map.get(event.canonical_id)
            if not db_id:
                continue
            zone = compute_impact_zone(event)
            zone["event_id"] = db_id
            zones.append(zone)

        if not zones:
            return

        # Upsert on event_id (UNIQUE constraint)
        resp = await client.post(
            f"{self.url}/rest/v1/impact_zones",
            json=zones,
            headers=self._headers(upsert=True),
            params={"on_conflict": "event_id"},
        )
        resp.raise_for_status()

    async def export(self, events: list[CanonicalEvent]) -> dict:
        """Upsert events and their impact zones into Supabase.

        Returns a summary dict with counts.
        """
        if not events:
            return {"status": "skipped", "reason": "empty batch"}

        if not self.url or not self.key:
            return {"status": "skipped", "reason": "SUPABASE_URL or SUPABASE_ANON_KEY not set"}

        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            db_rows = await self._upsert_events(client, events)
            await self._insert_impact_zones(client, events, db_rows)

        return {
            "status": "ok",
            "events_upserted": len(db_rows),
            "impact_zones_computed": len(events),
        }
