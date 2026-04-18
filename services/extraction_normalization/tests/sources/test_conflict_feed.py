"""Tests for ReliefWeb conflict feed adapter."""

from __future__ import annotations

import os

import pytest
import respx

from extraction_normalization.models.canonical_event import (
    EventFamily,
    EventType,
    GeometryType,
)
from extraction_normalization.sources.conflict_feed import ConflictFeedSource

SAMPLE_RW_DISASTER = {
    "id": "12345",
    "fields": {
        "name": "Complex Emergency in Syria",
        "primary_type": [{"name": "Complex Emergency", "id": 1}],
        "country": [{"iso3": "SYR", "name": "Syria"}],
        "date": [{"created": "2026-01-15T00:00:00+00:00"}],
        "status": "current",
        "description": "Ongoing crisis",
    },
}


@pytest.fixture
def source():
    return ConflictFeedSource()


class TestConflictNormalize:
    def test_normalizes_complex_emergency(self, source):
        event = source.normalize(SAMPLE_RW_DISASTER)
        assert event is not None
        assert event.canonical_id == "reliefweb:12345"
        assert event.event_type == EventType.CONFLICT
        assert event.event_family == EventFamily.HUMAN_CAUSED
        assert event.geometry_type == GeometryType.ADMIN_AREA
        assert "SYR" in event.country_codes
        assert event.region_name == "Syria"

    def test_missing_fields_returns_none(self, source):
        assert source.normalize({"id": "1"}) is None
        assert source.normalize({"id": "1", "fields": {}}) is None

    def test_missing_id_returns_none(self, source):
        assert source.normalize({}) is None


class TestConflictFetch:
    @pytest.mark.asyncio
    async def test_no_appname_returns_empty(self, source, monkeypatch):
        monkeypatch.delenv("RELIEFWEB_APPNAME", raising=False)
        result = await source.fetch_raw()
        assert result == []

    @respx.mock
    @pytest.mark.asyncio
    async def test_403_returns_empty(self, source, monkeypatch):
        monkeypatch.setenv("RELIEFWEB_APPNAME", "test-app")
        from extraction_normalization.sources.conflict_feed import RELIEFWEB_DISASTERS_URL

        respx.post(RELIEFWEB_DISASTERS_URL).respond(status_code=403)
        result = await source.fetch_raw()
        assert result == []

    @respx.mock
    @pytest.mark.asyncio
    async def test_successful_fetch(self, source, monkeypatch):
        monkeypatch.setenv("RELIEFWEB_APPNAME", "test-app")
        from extraction_normalization.sources.conflict_feed import RELIEFWEB_DISASTERS_URL

        respx.post(RELIEFWEB_DISASTERS_URL).respond(
            json={"data": [SAMPLE_RW_DISASTER]}
        )
        result = await source.fetch_raw()
        assert len(result) == 1
