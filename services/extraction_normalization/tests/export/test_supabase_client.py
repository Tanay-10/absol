"""Tests for the Supabase PostgREST client."""

from __future__ import annotations

from datetime import UTC, datetime

import httpx
import pytest
import respx

from extraction_normalization.export.supabase_client import (
    SupabaseClient,
    compute_impact_zone,
    event_to_row,
)
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventStatus,
    EventType,
    GeometryType,
    SeverityLabel,
)

FAKE_URL = "https://test.supabase.co"
FAKE_KEY = "test-anon-key"


def _make_event(**overrides) -> CanonicalEvent:
    defaults = {
        "canonical_id": "usgs:ev001",
        "source": "usgs",
        "source_event_id": "ev001",
        "event_family": EventFamily.NATURAL,
        "event_type": EventType.EARTHQUAKE,
        "title": "M5.0 Earthquake",
        "severity_label": SeverityLabel.MODERATE,
        "severity_score": 50,
        "status": EventStatus.ACTIVE,
        "detected_at": datetime(2026, 1, 15, 12, 0, 0, tzinfo=UTC),
        "occurred_at": datetime(2026, 1, 15, 11, 55, 0, tzinfo=UTC),
        "geometry_type": GeometryType.POINT,
        "latitude": 34.05,
        "longitude": -118.24,
        "country_codes": ["US"],
        "region_name": "California",
    }
    defaults.update(overrides)
    return CanonicalEvent(**defaults)


# ── event_to_row ─────────────────────────────────────────────────────────


class TestEventToRow:
    def test_maps_all_fields(self):
        event = _make_event()
        row = event_to_row(event)
        assert row["canonical_id"] == "usgs:ev001"
        assert row["source"] == "usgs"
        assert row["event_family"] == "natural"
        assert row["event_type"] == "earthquake"
        assert row["severity_label"] == "moderate"
        assert row["severity_score"] == 50
        assert row["status"] == "active"
        assert row["geometry_type"] == "point"
        assert row["latitude"] == 34.05
        assert row["longitude"] == -118.24
        assert row["country_codes"] == ["US"]
        assert row["schema_version"] == "v1"

    def test_none_optional_fields(self):
        event = _make_event(summary=None, event_subtype=None, source_url=None)
        row = event_to_row(event)
        assert row["summary"] is None
        assert row["event_subtype"] is None
        assert row["source_url"] is None

    def test_severity_inputs_serialized(self):
        event = _make_event()
        row = event_to_row(event)
        assert isinstance(row["severity_inputs"], dict)


# ── compute_impact_zone ──────────────────────────────────────────────────


class TestComputeImpactZone:
    def test_point_event_gives_radius_zone(self):
        event = _make_event(severity_score=50)
        zone = compute_impact_zone(event)
        assert zone["zone_type"] == "radius"
        assert zone["center_lat"] == 34.05
        assert zone["center_lon"] == -118.24
        # earthquake base=50, radius = 50 * (1 + 50/50) = 100
        assert zone["radius_km"] == 100.0
        assert zone["country_code"] == "US"

    def test_high_severity_increases_radius(self):
        event = _make_event(severity_score=100)
        zone = compute_impact_zone(event)
        # 50 * (1 + 100/50) = 150
        assert zone["radius_km"] == 150.0

    def test_bbox_event_gives_bbox_zone(self):
        event = _make_event(
            geometry_type=GeometryType.BBOX,
            bbox=[32.0, -120.0, 36.0, -116.0],
            latitude=None,
            longitude=None,
        )
        zone = compute_impact_zone(event)
        assert zone["zone_type"] == "bbox"
        assert zone["bbox"] == [32.0, -120.0, 36.0, -116.0]
        assert zone["center_lat"] is None

    def test_admin_area_gives_admin_zone(self):
        event = _make_event(
            geometry_type=GeometryType.ADMIN_AREA,
            latitude=None,
            longitude=None,
            region_name="California",
            country_codes=["US"],
        )
        zone = compute_impact_zone(event)
        assert zone["zone_type"] == "admin_area"
        assert zone["admin_region"] == "California"
        assert zone["country_code"] == "US"

    def test_wildfire_smaller_base_radius(self):
        event = _make_event(event_type=EventType.WILDFIRE, severity_score=50)
        zone = compute_impact_zone(event)
        # wildfire base=30, radius = 30 * (1 + 50/50) = 60
        assert zone["radius_km"] == 60.0

    def test_no_country_codes_gives_none(self):
        event = _make_event(country_codes=[])
        zone = compute_impact_zone(event)
        assert zone["country_code"] is None


# ── SupabaseClient ───────────────────────────────────────────────────────


class TestSupabaseClient:
    def test_skip_when_no_events(self):
        client = SupabaseClient(url=FAKE_URL, key=FAKE_KEY)
        import asyncio

        result = asyncio.run(client.export([]))
        assert result["status"] == "skipped"

    def test_skip_when_no_url(self):
        client = SupabaseClient(url="", key=FAKE_KEY)
        import asyncio

        result = asyncio.run(client.export([_make_event()]))
        assert result["status"] == "skipped"

    def test_skip_when_no_key(self):
        client = SupabaseClient(url=FAKE_URL, key="")
        import asyncio

        result = asyncio.run(client.export([_make_event()]))
        assert result["status"] == "skipped"

    @respx.mock
    @pytest.mark.asyncio
    async def test_upsert_events_and_zones(self):
        event = _make_event()
        db_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        # Mock events upsert
        respx.post(f"{FAKE_URL}/rest/v1/events").mock(
            return_value=httpx.Response(
                201,
                json=[{"id": db_id, "canonical_id": "usgs:ev001"}],
            )
        )
        # Mock impact_zones upsert
        respx.post(f"{FAKE_URL}/rest/v1/impact_zones").mock(
            return_value=httpx.Response(201, json=[{"id": "zone-1"}])
        )

        client = SupabaseClient(url=FAKE_URL, key=FAKE_KEY)
        result = await client.export([event])

        assert result["status"] == "ok"
        assert result["events_upserted"] == 1

    @respx.mock
    @pytest.mark.asyncio
    async def test_upsert_sends_correct_headers(self):
        event = _make_event()

        events_route = respx.post(f"{FAKE_URL}/rest/v1/events").mock(
            return_value=httpx.Response(
                201,
                json=[{"id": "uuid-1", "canonical_id": "usgs:ev001"}],
            )
        )
        respx.post(f"{FAKE_URL}/rest/v1/impact_zones").mock(
            return_value=httpx.Response(201, json=[])
        )

        client = SupabaseClient(url=FAKE_URL, key=FAKE_KEY)
        await client.export([event])

        req = events_route.calls[0].request
        assert req.headers["apikey"] == FAKE_KEY
        assert "Bearer" in req.headers["Authorization"]
        assert "merge-duplicates" in req.headers["Prefer"]

    @respx.mock
    @pytest.mark.asyncio
    async def test_multiple_events(self):
        events = [
            _make_event(),
            _make_event(
                canonical_id="gdacs:ev002",
                source="gdacs",
                source_event_id="ev002",
                title="M6.0 Earthquake",
            ),
        ]

        respx.post(f"{FAKE_URL}/rest/v1/events").mock(
            return_value=httpx.Response(
                201,
                json=[
                    {"id": "uuid-1", "canonical_id": "usgs:ev001"},
                    {"id": "uuid-2", "canonical_id": "gdacs:ev002"},
                ],
            )
        )
        respx.post(f"{FAKE_URL}/rest/v1/impact_zones").mock(
            return_value=httpx.Response(201, json=[])
        )

        client = SupabaseClient(url=FAKE_URL, key=FAKE_KEY)
        result = await client.export(events)
        assert result["events_upserted"] == 2
