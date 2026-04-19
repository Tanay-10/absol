"""Tests for DbClient — local SQLite exporter."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

import pytest

from extraction_normalization.export.db_client import DbClient
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventType,
    GeometryType,
    SeverityLabel,
)


def _make_event(**overrides) -> CanonicalEvent:
    defaults = {
        "canonical_id": "usgs:test123",
        "source": "usgs",
        "source_event_id": "test123",
        "event_family": EventFamily.NATURAL,
        "event_type": EventType.EARTHQUAKE,
        "title": "M5.5 earthquake",
        "severity_label": SeverityLabel.MODERATE,
        "severity_score": 55,
        "occurred_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "detected_at": datetime(2026, 1, 1, 0, 5, tzinfo=timezone.utc),
        "normalized_at": datetime(2026, 1, 1, 0, 6, tzinfo=timezone.utc),
        "latitude": 35.0,
        "longitude": -118.0,
        "geometry_type": GeometryType.POINT,
    }
    defaults.update(overrides)
    return CanonicalEvent(**defaults)


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    c = DbClient()
    c.db_path = db_path
    return c


# ── event_to_row ─────────────────────────────────────────────────────────


class TestEventToRow:
    def test_basic_conversion(self):
        event = _make_event()
        row = DbClient.event_to_row(event)
        assert row["canonical_id"] == "usgs:test123"
        assert row["event_type"] == "earthquake"
        assert row["severity_score"] == 55

    def test_enum_values_serialized(self):
        event = _make_event()
        row = DbClient.event_to_row(event)
        assert row["event_family"] == "natural"
        assert row["severity_label"] == "moderate"

    def test_datetime_iso_format(self):
        event = _make_event()
        row = DbClient.event_to_row(event)
        assert "2026-01-01" in row["occurred_at"]

    def test_bbox_serialized(self):
        event = _make_event(
            geometry_type=GeometryType.BBOX,
            bbox=[34.0, -119.0, 36.0, -117.0],
            latitude=None,
            longitude=None,
        )
        row = DbClient.event_to_row(event)
        assert json.loads(row["bbox"]) == [34.0, -119.0, 36.0, -117.0]

    def test_country_codes_serialized(self):
        event = _make_event(country_codes=["US", "MX"])
        row = DbClient.event_to_row(event)
        assert json.loads(row["country_codes"]) == ["US", "MX"]

    def test_none_optional_fields(self):
        event = _make_event(summary=None, event_subtype=None, source_url=None)
        row = DbClient.event_to_row(event)
        assert row["summary"] is None
        assert row["event_subtype"] is None
        assert row["source_url"] is None

    def test_severity_inputs_serialized(self):
        event = _make_event()
        row = DbClient.event_to_row(event)
        assert isinstance(row["severity_inputs"], str)
        parsed = json.loads(row["severity_inputs"])
        assert isinstance(parsed, dict)


# ── compute_impact_zone ──────────────────────────────────────────────────


class TestComputeImpactZone:
    def test_earthquake_zone(self):
        event = _make_event(severity_score=50)
        zone = DbClient.compute_impact_zone(event)
        assert zone["zone_type"] == "point"
        assert zone["radius_km"] == 200.0  # 100 * (1 + 50/50)

    def test_flood_zone(self):
        event = _make_event(event_type=EventType.FLOOD, severity_score=50)
        zone = DbClient.compute_impact_zone(event)
        assert zone["radius_km"] == 100.0  # 50 * (1 + 50/50)

    def test_bbox_included(self):
        event = _make_event(
            geometry_type=GeometryType.BBOX,
            bbox=[34.0, -119.0, 36.0, -117.0],
            latitude=None,
            longitude=None,
        )
        zone = DbClient.compute_impact_zone(event)
        assert json.loads(zone["bbox_json"]) == [34.0, -119.0, 36.0, -117.0]

    def test_region_in_admin_regions(self):
        event = _make_event(region_name="California")
        zone = DbClient.compute_impact_zone(event)
        assert json.loads(zone["admin_regions"]) == ["California"]

    def test_wildfire_smaller_base_radius(self):
        event = _make_event(event_type=EventType.WILDFIRE, severity_score=50)
        zone = DbClient.compute_impact_zone(event)
        assert zone["radius_km"] == 60.0  # 30 * (1 + 50/50)

    def test_high_severity_increases_radius(self):
        event = _make_event(severity_score=100)
        zone = DbClient.compute_impact_zone(event)
        # earthquake base=100, 100 * (1 + 100/50) = 300
        assert zone["radius_km"] == 300.0


# ── export (push to SQLite) ──────────────────────────────────────────────


class TestExport:
    @pytest.mark.asyncio
    async def test_insert_single_event(self, client):
        event = _make_event()
        result = await client.export([event])
        assert result["upserted"] == 1
        assert result["zones_created"] == 1

        conn = sqlite3.connect(client.db_path)
        rows = conn.execute("SELECT * FROM events").fetchall()
        assert len(rows) == 1
        conn.close()

    @pytest.mark.asyncio
    async def test_upsert_updates_existing(self, client):
        event1 = _make_event(title="Version 1")
        event2 = _make_event(title="Version 2")

        await client.export([event1])
        await client.export([event2])

        conn = sqlite3.connect(client.db_path)
        rows = conn.execute("SELECT * FROM events").fetchall()
        assert len(rows) == 1  # upsert, not duplicate

        cols = [desc[0] for desc in conn.execute("SELECT * FROM events").description]
        title_idx = cols.index("title")
        assert rows[0][title_idx] == "Version 2"
        conn.close()

    @pytest.mark.asyncio
    async def test_multiple_events(self, client):
        events = [
            _make_event(canonical_id="usgs:e1", source_event_id="e1", title="Event 1"),
            _make_event(canonical_id="usgs:e2", source_event_id="e2", title="Event 2"),
            _make_event(canonical_id="usgs:e3", source_event_id="e3", title="Event 3"),
        ]
        result = await client.export(events)
        assert result["upserted"] == 3
        assert result["zones_created"] == 3

    @pytest.mark.asyncio
    async def test_impact_zone_created(self, client):
        event = _make_event()
        await client.export([event])

        conn = sqlite3.connect(client.db_path)
        zones = conn.execute("SELECT * FROM impact_zones").fetchall()
        assert len(zones) == 1
        conn.close()

    @pytest.mark.asyncio
    async def test_tables_auto_created(self, client):
        """Tables are created on first push even if DB is empty."""
        event = _make_event()
        result = await client.export([event])
        assert result["upserted"] == 1

    @pytest.mark.asyncio
    async def test_skip_when_no_events(self, client):
        result = await client.export([])
        assert result["status"] == "skipped"

    @pytest.mark.asyncio
    async def test_status_ok_on_success(self, client):
        event = _make_event()
        result = await client.export([event])
        assert result["status"] == "ok"
        assert result["events_upserted"] == 1
