"""Tests for the canonical event schema and its validation rules."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventStatus,
    EventType,
    GeometryType,
    SeverityInputs,
    SeverityLabel,
)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _minimal_event(**overrides) -> dict:
    """Return the smallest valid event dict; override any field."""
    base = {
        "canonical_id": "usgs:abc123",
        "source": "usgs",
        "source_event_id": "abc123",
        "event_family": EventFamily.NATURAL,
        "event_type": EventType.EARTHQUAKE,
        "title": "M5.2 earthquake near Tokyo",
        "geometry_type": GeometryType.POINT,
        "latitude": 35.6,
        "longitude": 139.7,
    }
    base.update(overrides)
    return base


# ── Construction ─────────────────────────────────────────────────────────────


class TestConstruction:
    def test_minimal_event_is_valid(self):
        event = CanonicalEvent(**_minimal_event())
        assert event.canonical_id == "usgs:abc123"
        assert event.schema_version == "v1"
        assert event.severity_label == SeverityLabel.MODERATE
        assert event.severity_score == 50

    def test_full_event_round_trips(self):
        now = datetime.now(timezone.utc)
        event = CanonicalEvent(
            **_minimal_event(
                event_subtype="shallow",
                summary="Shallow M5.2 near Tokyo",
                severity_label=SeverityLabel.MAJOR,
                severity_score=72,
                status=EventStatus.ACTIVE,
                confidence=0.95,
                occurred_at=now,
                updated_at=now,
                detected_at=now,
                region_name="Kanto",
                country_codes=["JP"],
                severity_inputs=SeverityInputs(magnitude=5.2, alert_level="yellow"),
                source_url="https://earthquake.usgs.gov/abc123",
                raw_payload_ref="raw/usgs/2026-04-18/abc123.json",
                normalized_at=now,
            )
        )
        d = event.to_handoff_dict()
        assert d["event_subtype"] == "shallow"
        assert d["severity_score"] == 72
        assert d["country_codes"] == ["JP"]


# ── Canonical ID Validation ──────────────────────────────────────────────────


class TestCanonicalIdValidation:
    def test_mismatched_canonical_id_raises(self):
        with pytest.raises(ValidationError, match="canonical_id must be"):
            CanonicalEvent(**_minimal_event(canonical_id="wrong:id"))

    def test_correct_canonical_id_passes(self):
        event = CanonicalEvent(**_minimal_event())
        assert event.canonical_id == "usgs:abc123"


# ── Geometry Validation ──────────────────────────────────────────────────────


class TestGeometryValidation:
    def test_point_requires_lat_lon(self):
        with pytest.raises(ValidationError, match="latitude and longitude"):
            CanonicalEvent(**_minimal_event(latitude=None, longitude=None))

    def test_bbox_requires_4_elements(self):
        with pytest.raises(ValidationError, match="4-element bbox"):
            CanonicalEvent(
                **_minimal_event(
                    geometry_type=GeometryType.BBOX,
                    bbox=[1.0, 2.0],
                )
            )

    def test_valid_bbox(self):
        event = CanonicalEvent(
            **_minimal_event(
                geometry_type=GeometryType.BBOX,
                bbox=[35.0, 139.0, 36.0, 140.0],
                latitude=None,
                longitude=None,
            )
        )
        assert event.bbox == [35.0, 139.0, 36.0, 140.0]

    def test_admin_area_does_not_require_coords(self):
        event = CanonicalEvent(
            **_minimal_event(
                geometry_type=GeometryType.ADMIN_AREA,
                latitude=None,
                longitude=None,
                region_name="Assam",
                country_codes=["IN"],
            )
        )
        assert event.region_name == "Assam"


# ── Severity Score Bounds ────────────────────────────────────────────────────


class TestSeverityBounds:
    def test_score_below_zero_rejected(self):
        with pytest.raises(ValidationError):
            CanonicalEvent(**_minimal_event(severity_score=-1))

    def test_score_above_100_rejected(self):
        with pytest.raises(ValidationError):
            CanonicalEvent(**_minimal_event(severity_score=101))

    def test_boundary_values_accepted(self):
        e0 = CanonicalEvent(**_minimal_event(severity_score=0))
        e100 = CanonicalEvent(**_minimal_event(severity_score=100))
        assert e0.severity_score == 0
        assert e100.severity_score == 100


# ── Serialization ────────────────────────────────────────────────────────────


class TestSerialization:
    def test_to_handoff_dict_returns_json_safe(self):
        event = CanonicalEvent(**_minimal_event())
        d = event.to_handoff_dict()
        assert isinstance(d["detected_at"], str)
        assert isinstance(d["normalized_at"], str)
        assert d["schema_version"] == "v1"

    def test_enums_serialize_as_values(self):
        event = CanonicalEvent(**_minimal_event())
        d = event.to_handoff_dict()
        assert d["event_family"] == "natural"
        assert d["event_type"] == "earthquake"
        assert d["severity_label"] == "moderate"
