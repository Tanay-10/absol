"""Centralised configuration loaded from env vars / .env file."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ── Paths ────────────────────────────────────────────────────────────────────

SERVICE_ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_DIR = SERVICE_ROOT / "artifacts"
RAW_DIR = ARTIFACTS_DIR / "raw"
NORMALIZED_DIR = ARTIFACTS_DIR / "normalized"
REPLAY_DIR = ARTIFACTS_DIR / "replay"

# ── Source URLs ──────────────────────────────────────────────────────────────

GDACS_API_URL = os.getenv(
    "GDACS_API_URL",
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH",
)
USGS_API_URL = os.getenv(
    "USGS_API_URL",
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
)
EONET_API_URL = os.getenv(
    "EONET_API_URL",
    "https://eonet.gsfc.nasa.gov/api/v3/events",
)

# ── Backend ingestion ────────────────────────────────────────────────────────

INGESTION_BASE_URL = os.getenv("INGESTION_BASE_URL", "http://localhost:8000")
INGESTION_BATCH_ENDPOINT = os.getenv(
    "INGESTION_BATCH_ENDPOINT", "/ingestion/events/batch"
)

# ── Supabase (PostgREST) ────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# ── Pipeline tuning ─────────────────────────────────────────────────────────

FETCH_TIMEOUT_SECONDS = int(os.getenv("FETCH_TIMEOUT_SECONDS", "30"))
DEDUPE_TIME_WINDOW_HOURS = int(os.getenv("DEDUPE_TIME_WINDOW_HOURS", "24"))
DEDUPE_DISTANCE_KM = float(os.getenv("DEDUPE_DISTANCE_KM", "100"))
