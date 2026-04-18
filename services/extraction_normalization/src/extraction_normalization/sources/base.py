"""Abstract base class for all source adapters."""

from __future__ import annotations

import abc
from typing import Any

from extraction_normalization.models.canonical_event import CanonicalEvent


class BaseSource(abc.ABC):
    """Every source adapter must implement these two methods."""

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Short lowercase identifier used in canonical_id (e.g. 'usgs')."""

    @abc.abstractmethod
    async def fetch_raw(self) -> list[dict[str, Any]]:
        """Pull raw events from the upstream feed. Returns list of raw dicts."""

    @abc.abstractmethod
    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        """Convert one raw dict to a CanonicalEvent, or None if unprocessable."""

    async def fetch_and_normalize(self) -> list[CanonicalEvent]:
        """Convenience: fetch then normalize in one call."""
        raws = await self.fetch_raw()
        events: list[CanonicalEvent] = []
        for r in raws:
            try:
                event = self.normalize(r)
                if event is not None:
                    events.append(event)
            except Exception:
                # In a hackathon, log-and-skip is fine
                continue
        return events
