"""Centralized configuration from env vars."""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
EXTRACTION_SERVICE_PATH = os.getenv(
    "EXTRACTION_SERVICE_PATH",
    str(Path(__file__).resolve().parent.parent.parent.parent / "extraction_normalization"),
)
