"""Centralized configuration from env vars."""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _find_project_root() -> Path:
    p = Path(__file__).resolve().parent
    for _ in range(10):
        if (p / "PROJECT_PLAN.md").exists():
            return p
        p = p.parent
    return Path.cwd()


DATABASE_PATH = os.getenv(
    "DATABASE_PATH",
    str(_find_project_root() / "data" / "insureshield.db"),
)
EXTRACTION_SERVICE_PATH = os.getenv(
    "EXTRACTION_SERVICE_PATH",
    str(Path(__file__).resolve().parent.parent.parent.parent / "extraction_normalization"),
)
