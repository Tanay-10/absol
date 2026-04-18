"""Thin Supabase PostgREST client using httpx."""
from __future__ import annotations

from typing import Any

import httpx

from backend.config import SUPABASE_ANON_KEY, SUPABASE_URL


class SupabaseClient:
    """Minimal PostgREST client for Supabase."""

    def __init__(self, url: str = "", key: str = "") -> None:
        self.url = (url or SUPABASE_URL).rstrip("/")
        self.key = key or SUPABASE_ANON_KEY

    def _headers(self, *, prefer: str = "") -> dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    async def select(
        self,
        table: str,
        *,
        params: dict[str, str] | None = None,
        columns: str = "*",
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.url}/rest/v1/{table}",
                headers=self._headers(),
                params={"select": columns, **(params or {})},
            )
            resp.raise_for_status()
            return resp.json()

    async def insert(
        self, table: str, rows: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/{table}",
                json=rows,
                headers=self._headers(prefer="return=representation"),
            )
            resp.raise_for_status()
            return resp.json()

    async def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        on_conflict: str,
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/{table}",
                json=rows,
                headers=self._headers(
                    prefer="resolution=merge-duplicates,return=representation"
                ),
                params={"on_conflict": on_conflict},
            )
            resp.raise_for_status()
            return resp.json()

    async def rpc(self, fn_name: str, params: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/rpc/{fn_name}",
                json=params,
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()
