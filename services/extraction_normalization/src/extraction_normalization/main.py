"""Main entry point — runs the full extraction-normalization pipeline."""

from __future__ import annotations

import asyncio
import json
import sys

from extraction_normalization.export.backend_client import BackendClient
from extraction_normalization.export.supabase_client import SupabaseClient
from extraction_normalization.export.writer import JSONLWriter, RawPayloadWriter
from extraction_normalization.normalize.dedupe import Deduplicator
from extraction_normalization.pipeline import build_batch_payload, run_pipeline
from extraction_normalization.sources.base import BaseSource
from extraction_normalization.sources.eonet import EONETSource
from extraction_normalization.sources.gdacs import GDACSSource
from extraction_normalization.sources.usgs import USGSSource
from extraction_normalization.sources.conflict_feed import ConflictFeedSource


def get_default_sources() -> list[BaseSource]:
    return [
        GDACSSource(),
        USGSSource(),
        EONETSource(),
        ConflictFeedSource(),
    ]


async def main(
    push_to_backend: bool = False,
    write_artifacts: bool = True,
    push_to_db: bool = False,
) -> None:
    sources = get_default_sources()
    deduplicator = Deduplicator()

    exporters = []
    if write_artifacts:
        exporters.append(JSONLWriter())
    if push_to_backend:
        exporters.append(BackendClient())
    if push_to_db:
        exporters.append(SupabaseClient())

    print(f"[pipeline] Starting extraction from {len(sources)} sources...")

    # Fetch raw payloads and persist them
    raw_writer = RawPayloadWriter()
    for source in sources:
        try:
            raws = await source.fetch_raw()
            if raws:
                path = raw_writer.write(source.name, raws)
                print(f"[pipeline] {source.name}: fetched {len(raws)} raw events → {path}")
            else:
                print(f"[pipeline] {source.name}: no events returned")
        except Exception as e:
            print(f"[pipeline] {source.name}: fetch error — {e}")

    # Run the full pipeline
    events = await run_pipeline(
        sources=sources,
        deduplicator=deduplicator,
        exporters=exporters if exporters else None,
    )

    print(f"[pipeline] Normalized {len(events)} events after dedup")

    # Print batch payload summary
    batch = build_batch_payload(events)
    print(f"[pipeline] Batch payload: {len(batch['events'])} events, schema {batch['schema_version']}")

    if "--json" in sys.argv:
        print(json.dumps(batch, indent=2))


if __name__ == "__main__":
    push = "--push" in sys.argv
    no_artifacts = "--no-artifacts" in sys.argv
    db = "--db" in sys.argv
    asyncio.run(main(push_to_backend=push, write_artifacts=not no_artifacts, push_to_db=db))
