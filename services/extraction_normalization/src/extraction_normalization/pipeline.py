"""Pipeline orchestrator: fetch → normalize → dedupe → export."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from extraction_normalization.models.canonical_event import CanonicalEvent
from extraction_normalization.sources.base import BaseSource


async def run_pipeline(
    sources: list[BaseSource],
    deduplicator: Any | None = None,
    exporters: list[Any] | None = None,
) -> list[CanonicalEvent]:
    """Execute the full extraction-normalization pipeline.

    1. Fetch + normalize from all sources concurrently.
    2. Flatten results.
    3. Deduplicate (if a deduplicator is provided).
    4. Export (if exporters are provided).
    5. Return the final event list.
    """
    # Step 1 — concurrent fetch from all sources
    tasks = [source.fetch_and_normalize() for source in sources]
    results: list[list[CanonicalEvent]] = await asyncio.gather(
        *tasks, return_exceptions=False
    )

    # Step 2 — flatten
    all_events: list[CanonicalEvent] = []
    for batch in results:
        all_events.extend(batch)

    # Step 3 — deduplicate
    if deduplicator is not None:
        all_events = deduplicator.dedupe(all_events)

    # Step 4 — export
    if exporters:
        for exporter in exporters:
            await _maybe_await(exporter.export(all_events))

    return all_events


async def _maybe_await(result: Any) -> Any:
    """Await if coroutine, otherwise return directly."""
    if asyncio.iscoroutine(result):
        return await result
    return result


def build_batch_payload(events: list[CanonicalEvent]) -> dict:
    """Create the ingestion batch envelope."""
    return {
        "schema_version": "v1",
        "batch_generated_at": datetime.now(UTC).isoformat(),
        "producer": "extraction_normalization",
        "events": [e.to_handoff_dict() for e in events],
    }
