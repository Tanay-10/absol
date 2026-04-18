"""HTTP client for pushing normalized event batches to the ingestion API."""

from __future__ import annotations

import httpx

from extraction_normalization.config import (
    FETCH_TIMEOUT_SECONDS,
    INGESTION_BASE_URL,
    INGESTION_BATCH_ENDPOINT,
)
from extraction_normalization.models.canonical_event import CanonicalEvent
from extraction_normalization.pipeline import build_batch_payload


class BackendClient:
    """Sends normalized event batches to the ingestion backend."""

    def __init__(
        self,
        base_url: str | None = None,
        endpoint: str | None = None,
    ) -> None:
        self.base_url = base_url or INGESTION_BASE_URL
        self.endpoint = endpoint or INGESTION_BATCH_ENDPOINT

    async def export(self, events: list[CanonicalEvent]) -> dict:
        """POST a batch payload to the ingestion endpoint.

        Returns the response JSON or raises on failure.
        """
        if not events:
            return {"status": "skipped", "reason": "empty batch"}

        payload = build_batch_payload(events)
        url = f"{self.base_url}{self.endpoint}"

        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
