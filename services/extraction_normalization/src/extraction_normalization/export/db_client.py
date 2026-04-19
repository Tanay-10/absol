"""Local SQLite exporter — replaces Supabase PostgREST client."""

from __future__ import annotations

import asyncio
import json
import sqlite3
import uuid
from pathlib import Path

from extraction_normalization.config import DATABASE_PATH
from extraction_normalization.models.canonical_event import CanonicalEvent

_ENSURE_TABLES = """
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    canonical_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    event_family TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    severity_label TEXT NOT NULL,
    severity_score REAL NOT NULL,
    status TEXT DEFAULT 'active',
    confidence REAL,
    occurred_at TEXT NOT NULL,
    updated_at TEXT,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    geometry_type TEXT DEFAULT 'point',
    latitude REAL,
    longitude REAL,
    bbox TEXT,
    region_name TEXT,
    country_codes TEXT,
    severity_inputs TEXT,
    source_url TEXT,
    raw_payload_ref TEXT,
    normalized_at TEXT NOT NULL,
    schema_version TEXT DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS impact_zones (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    zone_type TEXT NOT NULL,
    radius_km REAL,
    bbox_json TEXT,
    admin_regions TEXT,
    estimated_population INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_impact_zones_event_id ON impact_zones(event_id);
"""

BASE_RADII: dict[str, float] = {
    "earthquake": 100,
    "flood": 50,
    "wildfire": 30,
    "tsunami": 200,
    "tornado": 20,
    "storm": 80,
    "cyclone": 150,
    "conflict": 40,
    "terrorism": 15,
    "industrial": 10,
    "volcanic_activity": 60,
    "other": 30,
}


class DbClient:
    """Sync SQLite exporter wrapped in asyncio.to_thread for pipeline use."""

    def __init__(self) -> None:
        self.db_path = DATABASE_PATH

    @staticmethod
    def event_to_row(event: CanonicalEvent) -> dict:
        """Convert CanonicalEvent to a dict suitable for SQLite INSERT."""
        return {
            "canonical_id": event.canonical_id,
            "source": event.source,
            "source_event_id": event.source_event_id,
            "event_family": event.event_family.value if hasattr(event.event_family, "value") else event.event_family,
            "event_type": event.event_type.value if hasattr(event.event_type, "value") else event.event_type,
            "event_subtype": event.event_subtype,
            "title": event.title,
            "summary": event.summary,
            "severity_label": event.severity_label.value if hasattr(event.severity_label, "value") else event.severity_label,
            "severity_score": event.severity_score,
            "status": event.status.value if hasattr(event.status, "value") else event.status,
            "confidence": event.confidence,
            "occurred_at": event.occurred_at.isoformat() if event.occurred_at else None,
            "updated_at": event.updated_at.isoformat() if event.updated_at else None,
            "detected_at": event.detected_at.isoformat() if event.detected_at else None,
            "geometry_type": event.geometry_type.value if hasattr(event.geometry_type, "value") else event.geometry_type,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "bbox": json.dumps(event.bbox) if event.bbox else None,
            "region_name": event.region_name,
            "country_codes": json.dumps(event.country_codes) if event.country_codes else None,
            "severity_inputs": json.dumps(event.severity_inputs.model_dump()) if hasattr(event.severity_inputs, "model_dump") else json.dumps(event.severity_inputs) if event.severity_inputs else None,
            "source_url": event.source_url,
            "raw_payload_ref": event.raw_payload_ref,
            "normalized_at": event.normalized_at.isoformat() if event.normalized_at else None,
            "schema_version": event.schema_version,
        }

    @staticmethod
    def compute_impact_zone(event: CanonicalEvent) -> dict:
        """Compute an impact zone for a canonical event."""
        et = event.event_type.value if hasattr(event.event_type, "value") else event.event_type
        base = BASE_RADII.get(et, 30)
        radius = base * (1 + event.severity_score / 50)
        gt = event.geometry_type.value if hasattr(event.geometry_type, "value") else event.geometry_type
        zone: dict = {
            "zone_type": gt or "point",
            "radius_km": round(radius, 1),
        }
        if event.bbox:
            zone["bbox_json"] = json.dumps(event.bbox)
        if event.region_name:
            zone["admin_regions"] = json.dumps([event.region_name])
        return zone

    def _push_sync(self, events: list[CanonicalEvent]) -> dict:
        """Synchronous SQLite upsert — run via asyncio.to_thread."""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executescript(_ENSURE_TABLES)

        upserted = 0
        zones_created = 0

        for event in events:
            row = self.event_to_row(event)
            uid = str(uuid.uuid4())

            cols = list(row.keys())
            placeholders = ", ".join("?" for _ in cols)
            update_set = ", ".join(f"{c} = excluded.{c}" for c in cols if c != "canonical_id")
            sql = (
                f"INSERT INTO events (id, {', '.join(cols)}) VALUES (?, {placeholders}) "
                f"ON CONFLICT(canonical_id) DO UPDATE SET {update_set}"
            )
            vals = [uid] + [row[c] for c in cols]
            conn.execute(sql, vals)
            upserted += 1

            cur = conn.execute(
                "SELECT id FROM events WHERE canonical_id = ?", (row["canonical_id"],)
            )
            event_id = cur.fetchone()[0]

            zone = self.compute_impact_zone(event)
            zone_id = str(uuid.uuid4())
            zone_cols = list(zone.keys())
            zone_placeholders = ", ".join("?" for _ in zone_cols)
            zone_update = ", ".join(f"{c} = excluded.{c}" for c in zone_cols)
            zone_sql = (
                f"INSERT INTO impact_zones (id, event_id, {', '.join(zone_cols)}) "
                f"VALUES (?, ?, {zone_placeholders}) "
                f"ON CONFLICT(event_id) DO UPDATE SET {zone_update}"
            )
            zone_vals = [zone_id, event_id] + [zone[c] for c in zone_cols]
            conn.execute(zone_sql, zone_vals)
            zones_created += 1

        conn.commit()
        conn.close()
        return {"upserted": upserted, "zones_created": zones_created}

    async def export(self, events: list[CanonicalEvent]) -> dict:
        """Async wrapper — matches the exporter interface used by pipeline.py."""
        if not events:
            return {"status": "skipped", "reason": "empty batch"}
        result = await asyncio.to_thread(self._push_sync, events)
        return {"status": "ok", "events_upserted": result["upserted"], **result}
