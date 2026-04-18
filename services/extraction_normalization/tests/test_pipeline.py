"""Tests for the pipeline orchestrator."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventType,
    GeometryType,
)
from extraction_normalization.pipeline import build_batch_payload, run_pipeline
from extraction_normalization.sources.base import BaseSource


# ── Fake source for testing ──────────────────────────────────────────────────


class FakeSource(BaseSource):
    """Deterministic test source."""

    def __init__(self, source_name: str, raw_items: list[dict[str, Any]]) -> None:
        self._name = source_name
        self._raws = raw_items

    @property
    def name(self) -> str:
        return self._name

    async def fetch_raw(self) -> list[dict[str, Any]]:
        return self._raws

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        eid = raw.get("id", "unknown")
        return CanonicalEvent(
            canonical_id=f"{self._name}:{eid}",
            source=self._name,
            source_event_id=str(eid),
            event_family=EventFamily.NATURAL,
            event_type=EventType.EARTHQUAKE,
            title=raw.get("title", "Test event"),
            geometry_type=GeometryType.POINT,
            latitude=0.0,
            longitude=0.0,
        )


class FailingSource(BaseSource):
    """Source whose normalize always raises."""

    @property
    def name(self) -> str:
        return "failing"

    async def fetch_raw(self) -> list[dict[str, Any]]:
        return [{"id": "x"}]

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        raise RuntimeError("Intentional failure")


# ── Tests ────────────────────────────────────────────────────────────────────


class TestRunPipeline:
    @pytest.mark.asyncio
    async def test_empty_sources_returns_empty(self):
        result = await run_pipeline([])
        assert result == []

    @pytest.mark.asyncio
    async def test_single_source_returns_events(self):
        src = FakeSource("test", [{"id": "1", "title": "EQ1"}, {"id": "2", "title": "EQ2"}])
        result = await run_pipeline([src])
        assert len(result) == 2
        assert result[0].canonical_id == "test:1"
        assert result[1].canonical_id == "test:2"

    @pytest.mark.asyncio
    async def test_multiple_sources_merged(self):
        s1 = FakeSource("usgs", [{"id": "a"}])
        s2 = FakeSource("gdacs", [{"id": "b"}, {"id": "c"}])
        result = await run_pipeline([s1, s2])
        assert len(result) == 3
        ids = {e.canonical_id for e in result}
        assert ids == {"usgs:a", "gdacs:b", "gdacs:c"}

    @pytest.mark.asyncio
    async def test_failing_normalize_skipped(self):
        src = FailingSource()
        result = await run_pipeline([src])
        assert result == []


class TestBatchPayload:
    def test_envelope_structure(self):
        event = CanonicalEvent(
            canonical_id="test:1",
            source="test",
            source_event_id="1",
            event_family=EventFamily.NATURAL,
            event_type=EventType.FLOOD,
            title="Test flood",
            geometry_type=GeometryType.POINT,
            latitude=0.0,
            longitude=0.0,
        )
        payload = build_batch_payload([event])
        assert payload["schema_version"] == "v1"
        assert payload["producer"] == "extraction_normalization"
        assert len(payload["events"]) == 1
        assert payload["events"][0]["canonical_id"] == "test:1"
        assert "batch_generated_at" in payload
