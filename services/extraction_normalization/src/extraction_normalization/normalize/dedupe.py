"""Lightweight deduplication for normalized events."""

from __future__ import annotations

from datetime import timedelta

from extraction_normalization.config import DEDUPE_DISTANCE_KM, DEDUPE_TIME_WINDOW_HOURS
from extraction_normalization.models.canonical_event import CanonicalEvent
from extraction_normalization.normalize.location import haversine_km

# Source priority — lower number wins when merging cross-source duplicates.
_SOURCE_PRIORITY: dict[str, int] = {
    "usgs": 1,
    "gdacs": 2,
    "eonet": 3,
    "reliefweb": 4,
}


class Deduplicator:
    """Deduplicate a list of CanonicalEvents.

    Strategy:
      1. Exact dedupe: same source + source_event_id → keep latest.
      2. Cross-source heuristic: same event_type + close in time + close in space.
    """

    def __init__(
        self,
        time_window_hours: float | None = None,
        distance_km: float | None = None,
    ) -> None:
        self.time_window = timedelta(hours=time_window_hours or DEDUPE_TIME_WINDOW_HOURS)
        self.distance_km = distance_km or DEDUPE_DISTANCE_KM

    def dedupe(self, events: list[CanonicalEvent]) -> list[CanonicalEvent]:
        # Phase 1: exact dedup by canonical_id
        by_id: dict[str, CanonicalEvent] = {}
        for e in events:
            existing = by_id.get(e.canonical_id)
            if existing is None or (e.updated_at and existing.updated_at and e.updated_at > existing.updated_at):
                by_id[e.canonical_id] = e
        unique = list(by_id.values())

        # Phase 2: cross-source heuristic dedupe
        kept: list[CanonicalEvent] = []
        for event in unique:
            duplicate_of = self._find_cross_duplicate(event, kept)
            if duplicate_of is None:
                kept.append(event)
            else:
                # Keep the higher-priority source
                idx = kept.index(duplicate_of)
                if _priority(event) < _priority(duplicate_of):
                    kept[idx] = event
        return kept

    def _find_cross_duplicate(
        self, candidate: CanonicalEvent, existing: list[CanonicalEvent]
    ) -> CanonicalEvent | None:
        for e in existing:
            if e.event_type != candidate.event_type:
                continue
            if not self._close_in_time(candidate, e):
                continue
            if self._close_in_space(candidate, e):
                return e
        return None

    def _close_in_time(self, a: CanonicalEvent, b: CanonicalEvent) -> bool:
        ta = a.occurred_at or a.detected_at
        tb = b.occurred_at or b.detected_at
        if ta is None or tb is None:
            return False
        # Normalize both to offset-aware UTC for safe comparison
        from datetime import timezone
        if ta.tzinfo is None:
            ta = ta.replace(tzinfo=timezone.utc)
        if tb.tzinfo is None:
            tb = tb.replace(tzinfo=timezone.utc)
        return abs(ta - tb) <= self.time_window

    def _close_in_space(self, a: CanonicalEvent, b: CanonicalEvent) -> bool:
        if (
            a.latitude is not None
            and a.longitude is not None
            and b.latitude is not None
            and b.longitude is not None
        ):
            dist = haversine_km(a.latitude, a.longitude, b.latitude, b.longitude)
            return dist <= self.distance_km
        # Fall back to country overlap
        if a.country_codes and b.country_codes:
            return bool(set(a.country_codes) & set(b.country_codes))
        return False


def _priority(event: CanonicalEvent) -> int:
    return _SOURCE_PRIORITY.get(event.source, 99)
