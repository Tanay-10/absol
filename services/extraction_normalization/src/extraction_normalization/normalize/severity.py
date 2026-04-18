"""Severity normalization — maps heterogeneous source signals to a 0-100 score + label."""

from __future__ import annotations

from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventType,
    SeverityInputs,
    SeverityLabel,
)

# ── Label from score ─────────────────────────────────────────────────────────

_SCORE_THRESHOLDS: list[tuple[int, SeverityLabel]] = [
    (85, SeverityLabel.CRITICAL),
    (65, SeverityLabel.SEVERE),
    (45, SeverityLabel.MAJOR),
    (25, SeverityLabel.MODERATE),
    (0, SeverityLabel.MINOR),
]


def label_from_score(score: int) -> SeverityLabel:
    for threshold, label in _SCORE_THRESHOLDS:
        if score >= threshold:
            return label
    return SeverityLabel.MINOR


# ── Per-type severity scoring ────────────────────────────────────────────────


def score_earthquake(inputs: SeverityInputs) -> int:
    mag = inputs.magnitude or 0
    base = min(int(mag * 12), 85)
    alert_bonus = _alert_level_bonus(inputs.alert_level)
    return min(base + alert_bonus, 100)


def score_flood(inputs: SeverityInputs) -> int:
    base = 50  # default moderate
    alert_bonus = _alert_level_bonus(inputs.alert_level)
    pop = inputs.affected_population or 0
    pop_bonus = min(int(pop / 100_000), 30) if pop > 0 else 0
    return min(base + alert_bonus + pop_bonus, 100)


def score_wildfire(inputs: SeverityInputs) -> int:
    mag = inputs.magnitude or 0  # typically acres or hectares
    if mag <= 0:
        return 40
    import math
    return min(int(math.log10(max(mag, 1)) * 20), 100)


def score_cyclone_storm(inputs: SeverityInputs) -> int:
    wind = inputs.wind_speed_kph or 0
    alert_bonus = _alert_level_bonus(inputs.alert_level)
    if wind > 0:
        base = min(int(wind / 2.5), 80)
    else:
        base = 50
    return min(base + alert_bonus, 100)


def score_conflict(inputs: SeverityInputs) -> int:
    base = 60  # conflicts reported publicly are inherently significant
    casualties = inputs.casualties_reported or 0
    if casualties > 1000:
        return 95
    if casualties > 100:
        return 80
    if casualties > 10:
        return 70
    return base


def score_generic(inputs: SeverityInputs) -> int:
    return 50 + _alert_level_bonus(inputs.alert_level)


# ── Dispatch ─────────────────────────────────────────────────────────────────

_SCORERS: dict = {
    EventType.EARTHQUAKE: score_earthquake,
    EventType.FLOOD: score_flood,
    EventType.WILDFIRE: score_wildfire,
    EventType.CYCLONE: score_cyclone_storm,
    EventType.STORM: score_cyclone_storm,
    EventType.TORNADO: score_cyclone_storm,
    EventType.CONFLICT: score_conflict,
    EventType.TERRORISM: score_conflict,
    EventType.INDUSTRIAL: score_conflict,
}


def compute_severity(event_type: EventType, inputs: SeverityInputs) -> tuple[int, SeverityLabel]:
    """Return (score, label) for the given event type and raw inputs."""
    scorer = _SCORERS.get(event_type, score_generic)
    score = scorer(inputs)
    return score, label_from_score(score)


def rescore_event(event: CanonicalEvent) -> CanonicalEvent:
    """Re-compute severity on an existing event (useful after enrichment)."""
    score, label = compute_severity(event.event_type, event.severity_inputs)
    return event.model_copy(update={"severity_score": score, "severity_label": label})


# ── Helpers ──────────────────────────────────────────────────────────────────


def _alert_level_bonus(alert: str | None) -> int:
    if not alert:
        return 0
    levels = {"red": 20, "orange": 12, "yellow": 6, "green": 0}
    return levels.get(alert.lower(), 5)
