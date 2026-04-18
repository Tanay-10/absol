"""Tests for geo utilities."""
import pytest
from backend.services.geo import haversine_km, point_in_bbox


class TestHaversine:
    def test_same_point_is_zero(self):
        assert haversine_km(34.05, -118.24, 34.05, -118.24) == 0.0

    def test_known_distance(self):
        # LA to SF ≈ 559 km
        d = haversine_km(34.05, -118.24, 37.77, -122.42)
        assert 550 < d < 570

    def test_antipodal(self):
        d = haversine_km(0, 0, 0, 180)
        assert 20000 < d < 20100


class TestPointInBbox:
    def test_inside(self):
        assert point_in_bbox(35.0, -118.0, [32.0, -120.0, 36.0, -116.0]) is True

    def test_outside(self):
        assert point_in_bbox(40.0, -118.0, [32.0, -120.0, 36.0, -116.0]) is False

    def test_on_edge(self):
        assert point_in_bbox(32.0, -120.0, [32.0, -120.0, 36.0, -116.0]) is True
