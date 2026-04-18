"""Tests for claim estimation service."""
from backend.services.claim_estimator import estimate_claim


class TestEstimateClaim:
    def test_basic_estimation(self):
        match = {"distance_km": 50, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 500000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.35, "severity_multiplier": 1.5}
        event = {"severity_score": 60}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        assert 0 < result["claim_probability"] <= 1
        assert result["estimated_amount"] > 0
        assert "base_claim_rate" in result["risk_factors"]

    def test_zero_distance_max_decay(self):
        match = {"distance_km": 0, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 1000000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.5, "severity_multiplier": 1.0}
        event = {"severity_score": 100}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        # distance_decay = max(0.1, 1.0 - 0/100) = 1.0
        # probability = 0.5 * (100/100 * 1.0) * 1.0 = 0.5
        assert abs(result["claim_probability"] - 0.5) < 0.01

    def test_far_distance_min_decay(self):
        match = {"distance_km": 95, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 100000, "policy_type": "auto"}
        relevance = {"base_claim_rate": 0.10, "severity_multiplier": 1.2}
        event = {"severity_score": 50}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        # distance_decay = max(0.1, 1.0 - 95/100) = 0.1
        assert result["claim_probability"] < 0.01

    def test_no_distance_bbox_match(self):
        match = {"distance_km": None, "match_method": "bbox_overlap", "policy_id": "pol1"}
        policy = {"coverage_amount": 200000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.4, "severity_multiplier": 1.3}
        event = {"severity_score": 70}
        zone = {"radius_km": None}

        result = estimate_claim(match, policy, relevance, event, zone)
        # No distance → decay = 0.7 (moderate default)
        assert result["claim_probability"] > 0
