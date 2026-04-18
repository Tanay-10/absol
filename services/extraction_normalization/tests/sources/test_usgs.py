"""Tests for USGS source adapter."""

from __future__ import annotations

import pytest
import respx
from httpx import Response

from extraction_normalization.models.canonical_event import (
    EventFamily,
    EventType,
    GeometryType,
    SeverityLabel,
)
from extraction_normalization.sources.usgs import USGSSource

SAMPLE_USGS_RESPONSE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "us6000sr3h",
            "properties": {
                "mag": 4.9,
                "place": "149 km E of Modisi, Indonesia",
                "time": 1776507820737,
                "updated": 1776509073040,
                "alert": None,
                "status": "reviewed",
                "tsunami": 0,
                "sig": 369,
                "magType": "mb",
                "type": "earthquake",
                "title": "M 4.9 - 149 km E of Modisi, Indonesia",
                "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us6000sr3h",
            },
            "geometry": {
                "type": "Point",
                "coordinates": [125.7661, 0.2372, 35],
            },
        },
        {
            "type": "Feature",
            "id": "us_big_one",
            "properties": {
                "mag": 7.2,
                "place": "Near coast of Chile",
                "time": 1776500000000,
                "updated": 1776501000000,
                "alert": "red",
                "status": "reviewed",
                "tsunami": 1,
                "sig": 800,
                "magType": "mww",
                "type": "earthquake",
                "title": "M 7.2 - Near coast of Chile",
                "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us_big_one",
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-71.5, -33.0, 25],
            },
        },
    ],
}


@pytest.fixture
def source():
    return USGSSource()


class TestUSGSNormalize:
    def test_normalizes_moderate_earthquake(self, source):
        raw = SAMPLE_USGS_RESPONSE["features"][0]
        event = source.normalize(raw)

        assert event is not None
        assert event.canonical_id == "usgs:us6000sr3h"
        assert event.event_type == EventType.EARTHQUAKE
        assert event.event_family == EventFamily.NATURAL
        assert event.latitude == pytest.approx(0.2372)
        assert event.longitude == pytest.approx(125.7661)
        assert event.severity_label == SeverityLabel.MODERATE
        assert event.geometry_type == GeometryType.POINT
        assert event.severity_inputs.magnitude == 4.9

    def test_normalizes_critical_earthquake(self, source):
        raw = SAMPLE_USGS_RESPONSE["features"][1]
        event = source.normalize(raw)

        assert event is not None
        assert event.severity_label == SeverityLabel.CRITICAL
        assert event.severity_score > 80
        assert event.severity_inputs.alert_level == "red"

    def test_missing_id_returns_none(self, source):
        raw = {"properties": {"mag": 3.0}, "geometry": {"coordinates": [0, 0, 0]}}
        assert source.normalize(raw) is None


class TestUSGSFetch:
    @respx.mock
    @pytest.mark.asyncio
    async def test_fetch_raw_returns_features(self, source):
        from extraction_normalization.config import USGS_API_URL

        respx.get(USGS_API_URL).respond(json=SAMPLE_USGS_RESPONSE)
        raws = await source.fetch_raw()
        assert len(raws) == 2

    @respx.mock
    @pytest.mark.asyncio
    async def test_fetch_and_normalize_end_to_end(self, source):
        from extraction_normalization.config import USGS_API_URL

        respx.get(USGS_API_URL).respond(json=SAMPLE_USGS_RESPONSE)
        events = await source.fetch_and_normalize()
        assert len(events) == 2
        assert events[0].source == "usgs"
