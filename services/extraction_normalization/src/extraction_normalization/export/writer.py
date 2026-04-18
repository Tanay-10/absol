"""JSONL artifact writer for debugging, replay, and fallback handoff."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from extraction_normalization.config import NORMALIZED_DIR, RAW_DIR
from extraction_normalization.models.canonical_event import CanonicalEvent


class JSONLWriter:
    """Writes normalized events to newline-delimited JSON files."""

    def __init__(self, output_dir: Path | None = None) -> None:
        self.output_dir = output_dir or NORMALIZED_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export(self, events: list[CanonicalEvent]) -> Path:
        ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        path = self.output_dir / f"{ts}.jsonl"
        with open(path, "w") as f:
            for event in events:
                f.write(json.dumps(event.to_handoff_dict()) + "\n")
        return path


class RawPayloadWriter:
    """Persists raw source payloads for debugging and replay."""

    def __init__(self, output_dir: Path | None = None) -> None:
        self.output_dir = output_dir or RAW_DIR

    def write(self, source_name: str, payloads: list[dict]) -> Path:
        ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        source_dir = self.output_dir / source_name
        source_dir.mkdir(parents=True, exist_ok=True)
        path = source_dir / f"{ts}.jsonl"
        with open(path, "w") as f:
            for p in payloads:
                f.write(json.dumps(p, default=str) + "\n")
        return path
