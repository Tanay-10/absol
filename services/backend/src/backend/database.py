"""Local SQLite database client."""
from __future__ import annotations

import json
import uuid as _uuid
from typing import Any

import aiosqlite

from backend.config import DATABASE_PATH


def _parse_value(v: Any) -> Any:
    """Auto-parse JSON-encoded text back to Python objects."""
    if isinstance(v, str) and len(v) >= 2 and v[0] in ("[", "{"):
        try:
            return json.loads(v)
        except (json.JSONDecodeError, ValueError):
            pass
    return v


def _prepare_value(v: Any) -> Any:
    """Prepare a Python value for SQLite storage."""
    if isinstance(v, (list, dict)):
        return json.dumps(v)
    return v


def new_id() -> str:
    return str(_uuid.uuid4())


class Database:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        from pathlib import Path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA foreign_keys=ON")

    async def close(self) -> None:
        if self._db:
            await self._db.close()
            self._db = None

    async def executescript(self, sql: str) -> None:
        assert self._db
        await self._db.executescript(sql)

    async def fetch_all(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        assert self._db
        async with self._db.execute(sql, params) as cur:
            rows = await cur.fetchall()
            return [{k: _parse_value(v) for k, v in dict(r).items()} for r in rows]

    async def fetch_one(self, sql: str, params: tuple = ()) -> dict[str, Any] | None:
        assert self._db
        async with self._db.execute(sql, params) as cur:
            row = await cur.fetchone()
            return {k: _parse_value(v) for k, v in dict(row).items()} if row else None

    async def execute(self, sql: str, params: tuple = ()) -> None:
        assert self._db
        await self._db.execute(sql, params)
        await self._db.commit()

    async def insert(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        assert self._db
        if "id" not in row:
            row = {"id": new_id(), **row}
        cols = list(row.keys())
        vals = tuple(_prepare_value(row[c]) for c in cols)
        await self._db.execute(
            f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
            vals,
        )
        await self._db.commit()
        return row

    async def insert_many(self, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        assert self._db
        result = []
        for row in rows:
            if "id" not in row:
                row = {"id": new_id(), **row}
            result.append(row)
        if not result:
            return result
        cols = list(result[0].keys())
        for row in result:
            vals = tuple(_prepare_value(row[c]) for c in cols)
            await self._db.execute(
                f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                vals,
            )
        await self._db.commit()
        return result

    async def upsert(
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        conflict_columns: list[str],
    ) -> list[dict[str, Any]]:
        """INSERT ... ON CONFLICT ... DO UPDATE, then re-fetch to get actual IDs."""
        assert self._db
        for row in rows:
            if "id" not in row:
                row["id"] = new_id()
            cols = list(row.keys())
            vals = tuple(_prepare_value(row[c]) for c in cols)
            conflict_str = ", ".join(conflict_columns)
            update_cols = [c for c in cols if c not in conflict_columns and c != "id"]
            if update_cols:
                update_str = ", ".join(f"{c} = excluded.{c}" for c in update_cols)
                sql = (
                    f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))}) "
                    f"ON CONFLICT({conflict_str}) DO UPDATE SET {update_str}"
                )
            else:
                sql = (
                    f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))}) "
                    f"ON CONFLICT({conflict_str}) DO NOTHING"
                )
            await self._db.execute(sql, vals)
        await self._db.commit()

        # Re-fetch to get actual database ids (existing rows keep their original id)
        result = []
        for row in rows:
            where_parts = [f"{c} = ?" for c in conflict_columns]
            where_vals = tuple(_prepare_value(row[c]) for c in conflict_columns)
            existing = await self.fetch_one(
                f"SELECT * FROM {table} WHERE {' AND '.join(where_parts)}",
                where_vals,
            )
            result.append(existing if existing else row)
        return result


# Singleton instance used by routers
db = Database(DATABASE_PATH)
