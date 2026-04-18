"""Raw event wrapper — minimal structure for source payloads before normalization."""

from __future__ import annotations

from datetime import datetime
from typing import Any


class RawEvent:
    """Thin wrapper that attaches source provenance to a raw payload dict."""

    __slots__ = ("source", "raw", "fetched_at")

    def __init__(self, source: str, raw: dict[str, Any]) -> None:
        self.source = source
        self.raw = raw
        self.fetched_at = datetime.utcnow()

    def __repr__(self) -> str:
        return f"RawEvent(source={self.source!r}, keys={list(self.raw.keys())})"
