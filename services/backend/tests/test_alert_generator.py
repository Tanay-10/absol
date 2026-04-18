"""Tests for alert generation service."""
from backend.services.alert_generator import generate_alert


class TestGenerateAlert:
    def test_low_alert(self):
        estimates = [
            {"claim_probability": 0.15, "estimated_amount": 5000}
            for _ in range(5)
        ]
        alert = generate_alert(estimates, total_policies=5)
        assert alert["alert_level"] == "low"
        assert alert["total_policies_affected"] == 5
        assert alert["estimated_claim_count"] == 5
        assert alert["recommended_action"] == "Monitor"

    def test_medium_alert(self):
        estimates = [
            {"claim_probability": 0.2, "estimated_amount": 10000}
            for _ in range(30)
        ]
        alert = generate_alert(estimates, total_policies=30)
        assert alert["alert_level"] == "medium"
        assert alert["recommended_action"] == "Notify team lead"

    def test_high_alert(self):
        estimates = [
            {"claim_probability": 0.3, "estimated_amount": 20000}
            for _ in range(100)
        ]
        alert = generate_alert(estimates, total_policies=100)
        assert alert["alert_level"] == "high"
        assert alert["recommended_action"] == "Activate surge team"

    def test_critical_alert(self):
        estimates = [
            {"claim_probability": 0.5, "estimated_amount": 50000}
            for _ in range(250)
        ]
        alert = generate_alert(estimates, total_policies=250)
        assert alert["alert_level"] == "critical"

    def test_filters_low_probability(self):
        estimates = [
            {"claim_probability": 0.05, "estimated_amount": 1000},
            {"claim_probability": 0.2, "estimated_amount": 10000},
        ]
        alert = generate_alert(estimates, total_policies=2)
        assert alert["estimated_claim_count"] == 1  # only the 0.2 one

    def test_zero_estimates(self):
        alert = generate_alert([], total_policies=0)
        assert alert["alert_level"] == "low"
        assert alert["estimated_claim_count"] == 0
