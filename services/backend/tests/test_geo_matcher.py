"""Tests for geo-matching service."""
import pytest
from backend.services.geo_matcher import find_matches


class TestFindMatches:
    def test_radius_match(self):
        zone = {
            "zone_type": "radius",
            "center_lat": 34.05,
            "center_lon": -118.24,
            "radius_km": 100,
            "bbox": None,
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.1, "longitude": -118.3, "country_code": "US"},
            {"id": "loc2", "policy_id": "pol2", "latitude": 40.0, "longitude": -74.0, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["earthquake", "flood"], "coverage_amount": 500000, "policy_type": "property"},
            {"id": "pol2", "covered_perils": ["earthquake"], "coverage_amount": 300000, "policy_type": "auto"},
        ]
        event = {"event_type": "earthquake", "severity_score": 60}

        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["location_id"] == "loc1"
        assert matches[0]["match_method"] == "radius"
        assert matches[0]["distance_km"] < 100

    def test_bbox_match(self):
        zone = {
            "zone_type": "bbox",
            "center_lat": None,
            "center_lon": None,
            "radius_km": None,
            "bbox": [32.0, -120.0, 36.0, -116.0],
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.0, "longitude": -118.0, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["flood"], "coverage_amount": 200000, "policy_type": "property"},
        ]
        event = {"event_type": "flood", "severity_score": 50}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["match_method"] == "bbox_overlap"

    def test_admin_match(self):
        zone = {
            "zone_type": "admin_area",
            "center_lat": None,
            "center_lon": None,
            "radius_km": None,
            "bbox": None,
            "admin_region": "California",
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.0, "longitude": -118.0, "country_code": "US"},
            {"id": "loc2", "policy_id": "pol2", "latitude": 35.6, "longitude": 139.7, "country_code": "JP"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["conflict"], "coverage_amount": 100000, "policy_type": "property"},
            {"id": "pol2", "covered_perils": ["conflict"], "coverage_amount": 100000, "policy_type": "property"},
        ]
        event = {"event_type": "conflict", "severity_score": 70}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["location_id"] == "loc1"
        assert matches[0]["match_method"] == "admin_match"

    def test_peril_filter(self):
        zone = {
            "zone_type": "radius",
            "center_lat": 34.05,
            "center_lon": -118.24,
            "radius_km": 200,
            "bbox": None,
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.1, "longitude": -118.3, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["flood"], "coverage_amount": 100000, "policy_type": "auto"},
        ]
        event = {"event_type": "earthquake", "severity_score": 50}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 0
