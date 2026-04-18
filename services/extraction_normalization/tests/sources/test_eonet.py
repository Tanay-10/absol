"""Tests for EONET source adapter."""

from __future__ import annotations

import pytest
import respx

from extraction_normalization.models.canonical_event import (
    EventFamily,
    EventStatus,
    EventType,
    SeverityLabel,
)
from extraction_normalization.sources.eonet import EONETSource

SAMPLE_WILDFIRE = {
    "id": "EONET_19714",
    "title": "Dismal Swamp Prescribed Fire, Minnesota",
    "description": None,
    "link": "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_19714",
    "closed": None,
    "categories": [{"id": "wildfires", "title": "Wildfires"}],
    "sources": [{"id": "IRWIN", "url": "https://irwin.doi.gov/observer/incidents/abc"}],
    "geometry": [
        {
            "magnitudeValue": 652.0,
            "magnitudeUnit": "acres",
            "date": "2026-04-15T09:41:00Z",
            "type": "Point",
            "coordinates": [-96.271767, 45.46325],
        }
    ],
}

SAMPLE_VOLCANO = {
    "id": "EONET_6478",
    "title": "Etna Volcano, Italy",
    "description": None,
    "link": "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_6478",
    "closed": "2026-03-01T00:00:00Z",
    "categories": [{"id": "volcanoes", "title": "Volcanoes"}],
    "sources": [],
    "geometry": [
        {
            "magnitudeValue": None,
            "magnitudeUnit": None,
            "date": "2026-02-20T12:00:00Z",
            "type": "Point",
            "coordinates": [15.0, 37.75],
        }
    ],
}


@pytest.fixture
def source():
    return EONETSource()


class TestEONETNormalize:
    def test_normalizes_wildfire(self, source):
        event = source.normalize(SAMPLE_WILDFIRE)
        assert event is not None
        assert event.canonical_id == "eonet:EONET_19714"
        assert event.event_type == EventType.WILDFIRE
        assert event.event_family == EventFamily.NATURAL
        assert event.status == EventStatus.ACTIVE
        assert event.latitude == pytest.approx(45.46325)
        assert event.longitude == pytest.approx(-96.271767)
        assert event.severity_inputs.magnitude == 652.0
        assert event.severity_label == SeverityLabel.MODERATE

    def test_normalizes_closed_volcano(self, source):
        event = source.normalize(SAMPLE_VOLCANO)
        assert event is not None
        assert event.event_type == EventType.VOLCANO
        assert event.status == EventStatus.ENDED
        assert event.severity_label == SeverityLabel.MODERATE

    def test_missing_id_returns_none(self, source):
        assert source.normalize({}) is None

    def test_no_geometry_returns_none(self, source):
        raw = {"id": "x", "categories": [{"id": "wildfires"}], "geometry": []}
        assert source.normalize(raw) is None


class TestEONETFetch:
    @respx.mock
    @pytest.mark.asyncio
    async def test_fetch_returns_events(self, source):
        from extraction_normalization.config import EONET_API_URL

        respx.get(EONET_API_URL).respond(
            json={"events": [SAMPLE_WILDFIRE, SAMPLE_VOLCANO]}
        )
        raws = await source.fetch_raw()
        assert len(raws) == 2
