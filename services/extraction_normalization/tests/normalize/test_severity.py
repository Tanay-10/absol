"""Tests for severity normalization."""

from __future__ import annotations

import pytest

from extraction_normalization.models.canonical_event import (
    EventType,
    SeverityInputs,
    SeverityLabel,
)
from extraction_normalization.normalize.severity import (
    compute_severity,
    label_from_score,
    score_earthquake,
    score_conflict,
    score_wildfire,
)


class TestLabelFromScore:
    @pytest.mark.parametrize(
        "score,expected",
        [
            (100, SeverityLabel.CRITICAL),
            (85, SeverityLabel.CRITICAL),
            (84, SeverityLabel.SEVERE),
            (65, SeverityLabel.SEVERE),
            (64, SeverityLabel.MAJOR),
            (45, SeverityLabel.MAJOR),
            (44, SeverityLabel.MODERATE),
            (25, SeverityLabel.MODERATE),
            (24, SeverityLabel.MINOR),
            (0, SeverityLabel.MINOR),
        ],
    )
    def test_thresholds(self, score, expected):
        assert label_from_score(score) == expected


class TestScoreEarthquake:
    def test_small_earthquake(self):
        inputs = SeverityInputs(magnitude=3.0)
        score = score_earthquake(inputs)
        assert 30 <= score <= 45

    def test_large_earthquake_with_red_alert(self):
        inputs = SeverityInputs(magnitude=7.5, alert_level="red")
        score = score_earthquake(inputs)
        assert score >= 85

    def test_no_magnitude(self):
        inputs = SeverityInputs()
        score = score_earthquake(inputs)
        assert score == 0  # 0 magnitude → 0 base


class TestScoreWildfire:
    def test_small_fire(self):
        inputs = SeverityInputs(magnitude=10)  # 10 acres
        score = score_wildfire(inputs)
        assert score > 0
        assert score < 50

    def test_large_fire(self):
        inputs = SeverityInputs(magnitude=100_000)
        score = score_wildfire(inputs)
        assert score >= 80

    def test_no_magnitude(self):
        assert score_wildfire(SeverityInputs()) == 40


class TestScoreConflict:
    def test_base_conflict(self):
        score = score_conflict(SeverityInputs())
        assert score == 60

    def test_high_casualties(self):
        score = score_conflict(SeverityInputs(casualties_reported=1500))
        assert score == 95

    def test_moderate_casualties(self):
        score = score_conflict(SeverityInputs(casualties_reported=50))
        assert score == 70


class TestComputeSeverity:
    def test_dispatches_to_correct_scorer(self):
        inputs = SeverityInputs(magnitude=6.5, alert_level="orange")
        score, label = compute_severity(EventType.EARTHQUAKE, inputs)
        assert score > 70
        assert label in (SeverityLabel.SEVERE, SeverityLabel.CRITICAL)

    def test_unknown_type_uses_generic(self):
        inputs = SeverityInputs(alert_level="red")
        score, label = compute_severity(EventType.OTHER, inputs)
        assert score == 70  # 50 + 20 for red
        assert label == SeverityLabel.SEVERE
