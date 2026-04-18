"""Tests for deduplication logic."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventType,
    GeometryType,
)
from extraction_normalization.normalize.dedupe import Deduplicator


def _event(
    source: str = "usgs",
    eid: str = "1",
    event_type: EventType = EventType.EARTHQUAKE,
    lat: float = 35.0,
    lon: float = 139.0,
    occurred_at: datetime | None = None,
    country_codes: list[str] | None = None,
) -> CanonicalEvent:
    return CanonicalEvent(
        canonical_id=f"{source}:{eid}",
        source=source,
        source_event_id=eid,
        event_family=EventFamily.NATURAL,
        event_type=event_type,
        title=f"Test {event_type.value}",
        geometry_type=GeometryType.POINT,
        latitude=lat,
        longitude=lon,
        occurred_at=occurred_at,
        country_codes=country_codes or [],
    )


class TestExactDedupe:
    def test_same_canonical_id_keeps_one(self):
        now = datetime.now(UTC)
        e1 = _event(occurred_at=now, eid="a")
        e2 = _event(occurred_at=now, eid="a")
        dd = Deduplicator()
        result = dd.dedupe([e1, e2])
        assert len(result) == 1

    def test_different_ids_kept(self):
        now = datetime.now(UTC)
        dd = Deduplicator()
        e1 = _event(eid="a", lat=35.0, lon=139.0, occurred_at=now)
        e2 = _event(eid="b", lat=-33.0, lon=-71.0, occurred_at=now)
        result = dd.dedupe([e1, e2])
        assert len(result) == 2


class TestCrossSourceDedupe:
    def test_same_event_from_two_sources_merged(self):
        now = datetime.now(UTC)
        usgs_eq = _event(source="usgs", eid="1", lat=35.0, lon=139.0, occurred_at=now)
        gdacs_eq = _event(source="gdacs", eid="99", lat=35.01, lon=139.01, occurred_at=now + timedelta(minutes=5))
        dd = Deduplicator(time_window_hours=1, distance_km=50)
        result = dd.dedupe([usgs_eq, gdacs_eq])
        assert len(result) == 1
        # USGS has higher priority
        assert result[0].source == "usgs"

    def test_different_types_not_merged(self):
        now = datetime.now(UTC)
        eq = _event(source="usgs", eid="1", event_type=EventType.EARTHQUAKE, occurred_at=now)
        fl = _event(source="gdacs", eid="2", event_type=EventType.FLOOD, occurred_at=now)
        dd = Deduplicator(time_window_hours=1, distance_km=50)
        result = dd.dedupe([eq, fl])
        assert len(result) == 2

    def test_far_apart_not_merged(self):
        now = datetime.now(UTC)
        e1 = _event(source="usgs", eid="1", lat=35.0, lon=139.0, occurred_at=now)
        e2 = _event(source="gdacs", eid="2", lat=-33.0, lon=-71.0, occurred_at=now)
        dd = Deduplicator(time_window_hours=1, distance_km=100)
        result = dd.dedupe([e1, e2])
        assert len(result) == 2

    def test_country_fallback_for_admin_events(self):
        now = datetime.now(UTC)
        e1 = CanonicalEvent(
            canonical_id="gdacs:1", source="gdacs", source_event_id="1",
            event_family=EventFamily.NATURAL, event_type=EventType.EARTHQUAKE,
            title="Test", geometry_type=GeometryType.ADMIN_AREA,
            latitude=None, longitude=None,
            occurred_at=now, country_codes=["SYR"], region_name="Syria",
        )
        e2 = CanonicalEvent(
            canonical_id="reliefweb:2", source="reliefweb", source_event_id="2",
            event_family=EventFamily.NATURAL, event_type=EventType.EARTHQUAKE,
            title="Test", geometry_type=GeometryType.ADMIN_AREA,
            latitude=None, longitude=None,
            occurred_at=now, country_codes=["SYR"], region_name="Syria",
        )
        dd = Deduplicator(time_window_hours=24, distance_km=500)
        result = dd.dedupe([e1, e2])
        assert len(result) == 1
        assert result[0].source == "gdacs"  # higher priority


class TestPriorityPreference:
    def test_lower_priority_source_replaced(self):
        now = datetime.now(UTC)
        eonet = _event(source="eonet", eid="a", occurred_at=now, lat=35.0, lon=139.0)
        usgs = _event(source="usgs", eid="b", occurred_at=now, lat=35.0, lon=139.0)
        dd = Deduplicator(time_window_hours=1, distance_km=50)
        # eonet arrives first, usgs replaces it
        result = dd.dedupe([eonet, usgs])
        assert len(result) == 1
        assert result[0].source == "usgs"
