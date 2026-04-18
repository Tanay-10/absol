"""Tests for GDACS source adapter."""

from __future__ import annotations

import pytest
import respx

from extraction_normalization.models.canonical_event import (
    EventFamily,
    EventType,
    GeometryType,
    SeverityLabel,
)
from extraction_normalization.sources.gdacs import GDACSSource

SAMPLE_GDACS_FEATURE = {
    "type": "Feature",
    "bbox": [125.7661, 0.2372, 125.7661, 0.2372],
    "geometry": {"type": "Point", "coordinates": [125.7661, 0.2372]},
    "properties": {
        "eventtype": "EQ",
        "eventid": 1536039,
        "episodeid": 1700661,
        "eventname": "",
        "name": "Earthquake in Indonesia",
        "description": "Earthquake in Indonesia",
        "htmldescription": "Green M 4.9 Earthquake in Indonesia.",
        "alertlevel": "Green",
        "alertscore": 1,
        "episodealertlevel": "Green",
        "episodealertscore": 0.0,
        "istemporary": "true",
        "iscurrent": "true",
        "country": "Indonesia",
        "iso3": "IDN",
        "fromdate": "2026-04-18T10:23:40",
        "todate": "2026-04-18T10:23:40",
        "datemodified": "2026-04-18T10:47:43",
        "source": "NEIC",
        "sourceid": "",
        "polygonlabel": "Centroid",
        "Class": "Point_Centroid",
        "affectedcountries": [
            {"iso2": "ID", "iso3": "IDN", "countryname": "Indonesia"}
        ],
        "severitydata": {"severity": 4.9, "severitytext": "Magnitude 4.9M, Depth:35km", "severityunit": "M"},
        "url": {
            "geometry": "https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=EQ&eventid=1536039",
            "report": "https://www.gdacs.org/report.aspx?eventid=1536039",
            "details": "https://www.gdacs.org/gdacsapi/api/events/geteventdata?eventtype=EQ&eventid=1536039",
        },
    },
}

SAMPLE_RED_CYCLONE = {
    "type": "Feature",
    "bbox": [80.0, 10.0, 90.0, 20.0],
    "geometry": {"type": "Point", "coordinates": [85.0, 15.0]},
    "properties": {
        "eventtype": "TC",
        "eventid": 999,
        "episodeid": 888,
        "name": "Tropical Cyclone in Bay of Bengal",
        "description": "Major cyclone",
        "alertlevel": "Red",
        "alertscore": 3,
        "iscurrent": "true",
        "country": "India",
        "iso3": "IND",
        "fromdate": "2026-04-15T00:00:00",
        "datemodified": "2026-04-16T00:00:00",
        "affectedcountries": [{"iso3": "IND"}, {"iso3": "BGD"}],
        "severitydata": {"severity": 200, "severitytext": "200 km/h", "severityunit": "km/h"},
        "url": {"report": "https://www.gdacs.org/report.aspx?eventid=999"},
    },
}


@pytest.fixture
def source():
    return GDACSSource()


class TestGDACSNormalize:
    def test_normalizes_green_earthquake(self, source):
        event = source.normalize(SAMPLE_GDACS_FEATURE)
        assert event is not None
        assert event.canonical_id == "gdacs:1536039"
        assert event.event_type == EventType.EARTHQUAKE
        assert event.event_family == EventFamily.NATURAL
        assert event.severity_label == SeverityLabel.MINOR
        assert event.country_codes == ["IDN"]
        assert event.latitude == pytest.approx(0.2372)

    def test_normalizes_red_cyclone_with_bbox(self, source):
        event = source.normalize(SAMPLE_RED_CYCLONE)
        assert event is not None
        assert event.event_type == EventType.CYCLONE
        assert event.severity_label == SeverityLabel.CRITICAL
        assert event.severity_score > 80
        assert event.geometry_type == GeometryType.BBOX
        assert event.bbox == [80.0, 10.0, 90.0, 20.0]
        assert set(event.country_codes) == {"IND", "BGD"}

    def test_missing_eventid_returns_none(self, source):
        bad = {"properties": {}, "geometry": {"coordinates": [0, 0]}}
        assert source.normalize(bad) is None


class TestGDACSFetch:
    @respx.mock
    @pytest.mark.asyncio
    async def test_fetch_returns_features(self, source):
        from extraction_normalization.config import GDACS_API_URL

        respx.get(GDACS_API_URL).respond(
            json={"features": [SAMPLE_GDACS_FEATURE]}
        )
        raws = await source.fetch_raw()
        assert len(raws) == 1
