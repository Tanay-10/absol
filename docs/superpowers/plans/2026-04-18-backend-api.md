# Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend that performs geo-matching, claim estimation, and alert generation — connecting the extraction pipeline to the database and frontend.

**Architecture:** FastAPI app with routers for events/alerts/dashboard/pipeline. Core logic in service modules (geo_matcher, claim_estimator, alert_generator). All database access via httpx → Supabase PostgREST. The pipeline run endpoint shells out to the extraction service.

**Tech Stack:** Python 3.11+, FastAPI, uvicorn, httpx (Supabase PostgREST client)

**Spec:** `docs/superpowers/specs/2026-04-18-full-app-design.md`

---

## File Structure

```
services/backend/
├── pyproject.toml
├── .env.example
├── .gitignore
├── src/backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py             # Env vars
│   ├── supabase.py           # PostgREST client wrapper
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── events.py         # GET /api/events, GET /api/events/{id}
│   │   ├── alerts.py         # GET /api/alerts
│   │   ├── dashboard.py      # GET /api/dashboard/summary
│   │   └── pipeline.py       # POST /api/pipeline/run
│   └── services/
│       ├── __init__.py
│       ├── geo.py            # Haversine + bbox containment
│       ├── geo_matcher.py    # Find affected insured locations
│       ├── claim_estimator.py # Claim probability + estimated amount
│       └── alert_generator.py # Aggregate → alert level
└── tests/
    ├── __init__.py
    ├── test_geo.py
    ├── test_geo_matcher.py
    ├── test_claim_estimator.py
    ├── test_alert_generator.py
    └── test_routers.py
```

---

### Task 1: Scaffold the backend service

**Files:**
- Create: `services/backend/pyproject.toml`
- Create: `services/backend/.env.example`
- Create: `services/backend/.gitignore`
- Create: `services/backend/src/backend/__init__.py`
- Create: `services/backend/src/backend/config.py`
- Create: `services/backend/src/backend/main.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "backend"
version = "0.1.0"
description = "FastAPI backend for insurance early-warning system"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115,<1",
    "uvicorn[standard]>=0.30,<1",
    "httpx>=0.27,<1",
    "python-dotenv>=1.0,<2",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0,<9",
    "pytest-asyncio>=0.24,<1",
    "respx>=0.22,<1",
    "httpx>=0.27,<1",
]

[tool.hatch.build.targets.wheel]
packages = ["src/backend"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
asyncio_mode = "strict"
```

- [ ] **Step 2: Create .env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
EXTRACTION_SERVICE_PATH=../extraction_normalization
```

- [ ] **Step 3: Create .gitignore**

```
__pycache__/
*.pyc
.pytest_cache/
*.egg-info/
dist/
.env
```

- [ ] **Step 4: Create config.py**

```python
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
```

- [ ] **Step 5: Create __init__.py files**

```bash
mkdir -p services/backend/src/backend/routers services/backend/src/backend/services services/backend/tests
touch services/backend/src/backend/__init__.py
touch services/backend/src/backend/routers/__init__.py
touch services/backend/src/backend/services/__init__.py
touch services/backend/tests/__init__.py
```

- [ ] **Step 6: Create main.py — FastAPI app with CORS**

```python
"""FastAPI application — insurance early-warning backend."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import alerts, dashboard, events, pipeline

app = FastAPI(
    title="InsureShield API",
    description="Insurance early-warning backend — geo-matching, claims, alerts",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7: Install dependencies**

```bash
cd services/backend && pip3 install -e ".[dev]"
```

- [ ] **Step 8: Commit**

```bash
git add services/backend/
git commit -m "feat(backend): scaffold FastAPI service with config and CORS"
```

---

### Task 2: Supabase PostgREST client wrapper

**Files:**
- Create: `services/backend/src/backend/supabase.py`

- [ ] **Step 1: Write the Supabase client**

This is a thin wrapper around httpx for Supabase PostgREST. It supports SELECT, INSERT, and UPSERT operations.

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add services/backend/src/backend/supabase.py
git commit -m "feat(backend): add Supabase PostgREST client wrapper"
```

---

### Task 3: Geo utilities and geo-matching service

**Files:**
- Create: `services/backend/src/backend/services/geo.py`
- Create: `services/backend/src/backend/services/geo_matcher.py`
- Create: `services/backend/tests/test_geo.py`
- Create: `services/backend/tests/test_geo_matcher.py`

- [ ] **Step 1: Write geo utility tests**

```python
"""Tests for geo utilities."""
import pytest
from backend.services.geo import haversine_km, point_in_bbox


class TestHaversine:
    def test_same_point_is_zero(self):
        assert haversine_km(34.05, -118.24, 34.05, -118.24) == 0.0

    def test_known_distance(self):
        # LA to SF ≈ 559 km
        d = haversine_km(34.05, -118.24, 37.77, -122.42)
        assert 550 < d < 570

    def test_antipodal(self):
        d = haversine_km(0, 0, 0, 180)
        assert 20000 < d < 20100


class TestPointInBbox:
    def test_inside(self):
        assert point_in_bbox(35.0, -118.0, [32.0, -120.0, 36.0, -116.0]) is True

    def test_outside(self):
        assert point_in_bbox(40.0, -118.0, [32.0, -120.0, 36.0, -116.0]) is False

    def test_on_edge(self):
        assert point_in_bbox(32.0, -120.0, [32.0, -120.0, 36.0, -116.0]) is True
```

- [ ] **Step 2: Implement geo utilities**

```python
"""Geographic utility functions."""
from __future__ import annotations
import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def point_in_bbox(
    lat: float, lon: float, bbox: list[float]
) -> bool:
    """Check if a point is inside a bounding box [min_lat, min_lon, max_lat, max_lon]."""
    min_lat, min_lon, max_lat, max_lon = bbox
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon
```

- [ ] **Step 3: Run geo tests**

```bash
cd services/backend && python -m pytest tests/test_geo.py -v
```

- [ ] **Step 4: Write geo-matcher tests**

```python
"""Tests for geo-matching service."""
import pytest
from backend.services.geo_matcher import find_matches


class TestFindMatches:
    def test_radius_match(self):
        zone = {
            "zone_type": "radius",
            "center_lat": 34.05,
            "center_lon": -118.24,
            "radius_km": 100,
            "bbox": None,
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.1, "longitude": -118.3, "country_code": "US"},
            {"id": "loc2", "policy_id": "pol2", "latitude": 40.0, "longitude": -74.0, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["earthquake", "flood"], "coverage_amount": 500000, "policy_type": "property"},
            {"id": "pol2", "covered_perils": ["earthquake"], "coverage_amount": 300000, "policy_type": "auto"},
        ]
        event = {"event_type": "earthquake", "severity_score": 60}

        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["location_id"] == "loc1"
        assert matches[0]["match_method"] == "radius"
        assert matches[0]["distance_km"] < 100

    def test_bbox_match(self):
        zone = {
            "zone_type": "bbox",
            "center_lat": None,
            "center_lon": None,
            "radius_km": None,
            "bbox": [32.0, -120.0, 36.0, -116.0],
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.0, "longitude": -118.0, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["flood"], "coverage_amount": 200000, "policy_type": "property"},
        ]
        event = {"event_type": "flood", "severity_score": 50}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["match_method"] == "bbox_overlap"

    def test_admin_match(self):
        zone = {
            "zone_type": "admin_area",
            "center_lat": None,
            "center_lon": None,
            "radius_km": None,
            "bbox": None,
            "admin_region": "California",
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.0, "longitude": -118.0, "country_code": "US"},
            {"id": "loc2", "policy_id": "pol2", "latitude": 35.6, "longitude": 139.7, "country_code": "JP"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["conflict"], "coverage_amount": 100000, "policy_type": "property"},
            {"id": "pol2", "covered_perils": ["conflict"], "coverage_amount": 100000, "policy_type": "property"},
        ]
        event = {"event_type": "conflict", "severity_score": 70}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 1
        assert matches[0]["location_id"] == "loc1"
        assert matches[0]["match_method"] == "admin_match"

    def test_peril_filter(self):
        zone = {
            "zone_type": "radius",
            "center_lat": 34.05,
            "center_lon": -118.24,
            "radius_km": 200,
            "bbox": None,
            "admin_region": None,
            "country_code": "US",
        }
        locations = [
            {"id": "loc1", "policy_id": "pol1", "latitude": 34.1, "longitude": -118.3, "country_code": "US"},
        ]
        policies = [
            {"id": "pol1", "covered_perils": ["flood"], "coverage_amount": 100000, "policy_type": "auto"},
        ]
        event = {"event_type": "earthquake", "severity_score": 50}
        matches = find_matches(zone, locations, policies, event)
        assert len(matches) == 0
```

- [ ] **Step 5: Implement geo-matcher**

```python
"""Geo-matching service — finds insured locations within an event's impact zone."""
from __future__ import annotations

from backend.services.geo import haversine_km, point_in_bbox


def find_matches(
    zone: dict,
    locations: list[dict],
    policies: list[dict],
    event: dict,
) -> list[dict]:
    """Find insured locations within the impact zone that cover the event's peril.

    Returns a list of match dicts ready for insertion into exposure_matches.
    """
    policy_map = {p["id"]: p for p in policies}
    event_type = event["event_type"]
    matches = []

    for loc in locations:
        policy = policy_map.get(loc["policy_id"])
        if not policy:
            continue

        covered = policy.get("covered_perils", [])
        if event_type not in covered:
            continue

        distance_km = None
        match_method = None

        if zone["zone_type"] == "radius":
            d = haversine_km(
                zone["center_lat"], zone["center_lon"],
                loc["latitude"], loc["longitude"],
            )
            if d > zone["radius_km"]:
                continue
            distance_km = round(d, 2)
            match_method = "radius"

        elif zone["zone_type"] == "bbox":
            if not point_in_bbox(loc["latitude"], loc["longitude"], zone["bbox"]):
                continue
            match_method = "bbox_overlap"

        elif zone["zone_type"] == "admin_area":
            if loc.get("country_code") != zone.get("country_code"):
                continue
            match_method = "admin_match"

        else:
            continue

        matches.append({
            "event_id": None,  # filled by caller with DB uuid
            "policy_id": loc["policy_id"],
            "location_id": loc["id"],
            "distance_km": distance_km,
            "match_method": match_method,
        })

    return matches
```

- [ ] **Step 6: Run geo-matcher tests**

```bash
cd services/backend && python -m pytest tests/test_geo.py tests/test_geo_matcher.py -v
```

- [ ] **Step 7: Commit**

```bash
git add services/backend/src/backend/services/geo.py services/backend/src/backend/services/geo_matcher.py services/backend/tests/test_geo.py services/backend/tests/test_geo_matcher.py
git commit -m "feat(backend): add geo utilities and geo-matching service"
```

---

### Task 4: Claim estimation service

**Files:**
- Create: `services/backend/src/backend/services/claim_estimator.py`
- Create: `services/backend/tests/test_claim_estimator.py`

- [ ] **Step 1: Write claim estimator tests**

```python
"""Tests for claim estimation service."""
from backend.services.claim_estimator import estimate_claim


class TestEstimateClaim:
    def test_basic_estimation(self):
        match = {"distance_km": 50, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 500000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.35, "severity_multiplier": 1.5}
        event = {"severity_score": 60}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        assert 0 < result["claim_probability"] <= 1
        assert result["estimated_amount"] > 0
        assert "base_claim_rate" in result["risk_factors"]

    def test_zero_distance_max_decay(self):
        match = {"distance_km": 0, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 1000000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.5, "severity_multiplier": 1.0}
        event = {"severity_score": 100}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        # distance_decay = max(0.1, 1.0 - 0/100) = 1.0
        # probability = 0.5 * (100/100 * 1.0) * 1.0 = 0.5
        assert abs(result["claim_probability"] - 0.5) < 0.01

    def test_far_distance_min_decay(self):
        match = {"distance_km": 95, "match_method": "radius", "policy_id": "pol1"}
        policy = {"coverage_amount": 100000, "policy_type": "auto"}
        relevance = {"base_claim_rate": 0.10, "severity_multiplier": 1.2}
        event = {"severity_score": 50}
        zone = {"radius_km": 100}

        result = estimate_claim(match, policy, relevance, event, zone)
        # distance_decay = max(0.1, 1.0 - 95/100) = 0.1
        assert result["claim_probability"] < 0.01

    def test_no_distance_bbox_match(self):
        match = {"distance_km": None, "match_method": "bbox_overlap", "policy_id": "pol1"}
        policy = {"coverage_amount": 200000, "policy_type": "property"}
        relevance = {"base_claim_rate": 0.4, "severity_multiplier": 1.3}
        event = {"severity_score": 70}
        zone = {"radius_km": None}

        result = estimate_claim(match, policy, relevance, event, zone)
        # No distance → decay = 0.7 (moderate default)
        assert result["claim_probability"] > 0
```

- [ ] **Step 2: Implement claim estimator**

```python
"""Claim estimation — computes probability and estimated amount per exposure match."""
from __future__ import annotations


def estimate_claim(
    match: dict,
    policy: dict,
    relevance: dict,
    event: dict,
    zone: dict,
) -> dict:
    """Apply the claim estimation formula from the spec.

    Formula:
        claim_probability = base_claim_rate × (severity_score/100 × severity_multiplier) × distance_decay
        estimated_amount = coverage_amount × claim_probability
        distance_decay = max(0.1, 1.0 - (distance_km / radius_km))
    """
    base_rate = relevance["base_claim_rate"]
    sev_mult = relevance["severity_multiplier"]
    severity = event["severity_score"]
    coverage = policy["coverage_amount"]

    # Distance decay
    distance_km = match.get("distance_km")
    radius_km = zone.get("radius_km")

    if distance_km is not None and radius_km is not None and radius_km > 0:
        decay = max(0.1, 1.0 - (distance_km / radius_km))
    else:
        decay = 0.7  # default for bbox/admin matches without distance

    severity_factor = (severity / 100) * sev_mult
    probability = min(1.0, base_rate * severity_factor * decay)
    amount = round(coverage * probability, 2)

    return {
        "claim_probability": round(probability, 4),
        "estimated_amount": amount,
        "risk_factors": {
            "base_claim_rate": base_rate,
            "severity_factor": round(severity_factor, 4),
            "distance_decay": round(decay, 4),
            "final_probability": round(probability, 4),
            "reasoning": (
                f"{policy['policy_type']} policy, "
                f"severity {severity}/100, "
                f"decay {decay:.2f}"
            ),
        },
    }
```

- [ ] **Step 3: Run tests**

```bash
cd services/backend && python -m pytest tests/test_claim_estimator.py -v
```

- [ ] **Step 4: Commit**

```bash
git add services/backend/src/backend/services/claim_estimator.py services/backend/tests/test_claim_estimator.py
git commit -m "feat(backend): add claim estimation service"
```

---

### Task 5: Alert generation service

**Files:**
- Create: `services/backend/src/backend/services/alert_generator.py`
- Create: `services/backend/tests/test_alert_generator.py`

- [ ] **Step 1: Write alert generator tests**

```python
"""Tests for alert generation service."""
from backend.services.alert_generator import generate_alert


class TestGenerateAlert:
    def test_low_alert(self):
        estimates = [
            {"claim_probability": 0.15, "estimated_amount": 5000}
            for _ in range(5)
        ]
        alert = generate_alert(estimates, total_policies=5)
        assert alert["alert_level"] == "low"
        assert alert["total_policies_affected"] == 5
        assert alert["estimated_claim_count"] == 5
        assert alert["recommended_action"] == "Monitor"

    def test_medium_alert(self):
        estimates = [
            {"claim_probability": 0.2, "estimated_amount": 10000}
            for _ in range(30)
        ]
        alert = generate_alert(estimates, total_policies=30)
        assert alert["alert_level"] == "medium"
        assert alert["recommended_action"] == "Notify team lead"

    def test_high_alert(self):
        estimates = [
            {"claim_probability": 0.3, "estimated_amount": 20000}
            for _ in range(100)
        ]
        alert = generate_alert(estimates, total_policies=100)
        assert alert["alert_level"] == "high"
        assert alert["recommended_action"] == "Activate surge team"

    def test_critical_alert(self):
        estimates = [
            {"claim_probability": 0.5, "estimated_amount": 50000}
            for _ in range(250)
        ]
        alert = generate_alert(estimates, total_policies=250)
        assert alert["alert_level"] == "critical"

    def test_filters_low_probability(self):
        estimates = [
            {"claim_probability": 0.05, "estimated_amount": 1000},
            {"claim_probability": 0.2, "estimated_amount": 10000},
        ]
        alert = generate_alert(estimates, total_policies=2)
        assert alert["estimated_claim_count"] == 1  # only the 0.2 one

    def test_zero_estimates(self):
        alert = generate_alert([], total_policies=0)
        assert alert["alert_level"] == "low"
        assert alert["estimated_claim_count"] == 0
```

- [ ] **Step 2: Implement alert generator**

```python
"""Alert generation — aggregates claim estimates into an event-level alert."""
from __future__ import annotations


def generate_alert(
    estimates: list[dict],
    total_policies: int,
) -> dict:
    """Generate an alert from a list of claim estimates.

    Alert levels:
        0-10 claims → low (Monitor)
        11-50 → medium (Notify team lead)
        51-200 → high (Activate surge team)
        200+ → critical (Full emergency response)
    """
    likely_claims = [e for e in estimates if e["claim_probability"] > 0.1]
    claim_count = len(likely_claims)
    total_amount = sum(e["estimated_amount"] for e in likely_claims)

    if claim_count > 200:
        level, action = "critical", "Full emergency response"
    elif claim_count > 50:
        level, action = "high", "Activate surge team"
    elif claim_count > 10:
        level, action = "medium", "Notify team lead"
    else:
        level, action = "low", "Monitor"

    return {
        "alert_level": level,
        "total_policies_affected": total_policies,
        "estimated_claim_count": claim_count,
        "estimated_total_amount": round(total_amount, 2),
        "recommended_action": action,
    }
```

- [ ] **Step 3: Run tests**

```bash
cd services/backend && python -m pytest tests/test_alert_generator.py -v
```

- [ ] **Step 4: Commit**

```bash
git add services/backend/src/backend/services/alert_generator.py services/backend/tests/test_alert_generator.py
git commit -m "feat(backend): add alert generation service"
```

---

### Task 6: API routers (events, alerts, dashboard, pipeline)

**Files:**
- Create: `services/backend/src/backend/routers/events.py`
- Create: `services/backend/src/backend/routers/alerts.py`
- Create: `services/backend/src/backend/routers/dashboard.py`
- Create: `services/backend/src/backend/routers/pipeline.py`
- Create: `services/backend/tests/test_routers.py`

- [ ] **Step 1: Create events router**

```python
"""Event endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.supabase import SupabaseClient

router = APIRouter(tags=["events"])
db = SupabaseClient()


@router.get("/events")
async def list_events(
    event_type: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(50, le=200),
):
    params: dict[str, str] = {"order": "detected_at.desc", "limit": str(limit)}
    if event_type:
        params["event_type"] = f"eq.{event_type}"
    if severity:
        params["severity_label"] = f"eq.{severity}"
    return await db.select("events", params=params)


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    rows = await db.select("events", params={"id": f"eq.{event_id}"})
    if not rows:
        raise HTTPException(404, "Event not found")
    event = rows[0]

    # Fetch related data
    zones = await db.select("impact_zones", params={"event_id": f"eq.{event_id}"})
    matches = await db.select(
        "exposure_matches",
        params={"event_id": f"eq.{event_id}"},
        columns="*,policies(*,policyholders(*)),insured_locations(*)",
    )
    estimates = await db.select(
        "claim_estimates",
        params={"exposure_match_id": f"in.({','.join(m['id'] for m in matches)})"}
    ) if matches else []
    alerts_data = await db.select("alerts", params={"event_id": f"eq.{event_id}"})

    return {
        "event": event,
        "impact_zone": zones[0] if zones else None,
        "matches": matches,
        "estimates": estimates,
        "alert": alerts_data[0] if alerts_data else None,
    }
```

- [ ] **Step 2: Create alerts router**

```python
"""Alert endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Query

from backend.supabase import SupabaseClient

router = APIRouter(tags=["alerts"])
db = SupabaseClient()


@router.get("/alerts")
async def list_alerts(
    level: str | None = Query(None),
    limit: int = Query(50, le=200),
):
    params: dict[str, str] = {"order": "generated_at.desc", "limit": str(limit)}
    if level:
        params["alert_level"] = f"eq.{level}"

    alerts = await db.select(
        "alerts",
        params=params,
        columns="*,events(id,canonical_id,event_type,title,severity_label,severity_score,latitude,longitude,region_name)",
    )
    return alerts
```

- [ ] **Step 3: Create dashboard router**

```python
"""Dashboard summary endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from backend.supabase import SupabaseClient

router = APIRouter(tags=["dashboard"])
db = SupabaseClient()


@router.get("/dashboard/summary")
async def dashboard_summary():
    events = await db.select("events", columns="id", params={"limit": "10000"})
    alerts = await db.select("alerts", columns="id,alert_level,estimated_claim_count,estimated_total_amount", params={"limit": "10000"})
    policies = await db.select("policies", columns="id", params={"limit": "10000"})
    matches = await db.select("exposure_matches", columns="id", params={"limit": "10000"})

    active_alerts = [a for a in alerts if a.get("alert_level") in ("high", "critical")]

    return {
        "total_events": len(events),
        "total_alerts": len(alerts),
        "active_alerts": len(active_alerts),
        "total_policies": len(policies),
        "total_matches": len(matches),
        "estimated_claims": sum(a.get("estimated_claim_count", 0) for a in alerts),
        "estimated_total_amount": sum(float(a.get("estimated_total_amount", 0)) for a in alerts),
        "alert_breakdown": {
            "low": sum(1 for a in alerts if a.get("alert_level") == "low"),
            "medium": sum(1 for a in alerts if a.get("alert_level") == "medium"),
            "high": sum(1 for a in alerts if a.get("alert_level") == "high"),
            "critical": sum(1 for a in alerts if a.get("alert_level") == "critical"),
        },
    }
```

- [ ] **Step 4: Create pipeline router**

This is the orchestration endpoint. It runs extraction → geo-matching → claims → alerts.

```python
"""Pipeline orchestration endpoint."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from fastapi import APIRouter

from backend.config import EXTRACTION_SERVICE_PATH
from backend.services.alert_generator import generate_alert
from backend.services.claim_estimator import estimate_claim
from backend.services.geo_matcher import find_matches
from backend.supabase import SupabaseClient

router = APIRouter(tags=["pipeline"])
db = SupabaseClient()


async def _run_extraction() -> str:
    """Run the extraction pipeline as a subprocess."""
    service_path = Path(EXTRACTION_SERVICE_PATH)
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "extraction_normalization.main", "--db", "--no-artifacts",
        cwd=str(service_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return stdout.decode() + stderr.decode()


async def _process_event(event: dict) -> dict:
    """Run geo-matching, claim estimation, and alert generation for one event."""
    event_id = event["id"]

    # Get impact zone
    zones = await db.select("impact_zones", params={"event_id": f"eq.{event_id}"})
    if not zones:
        return {"event_id": event_id, "status": "no_impact_zone"}
    zone = zones[0]

    # Get all insured locations and policies
    locations = await db.select("insured_locations", columns="id,policy_id,latitude,longitude,country_code")
    policies = await db.select("policies", columns="id,policy_type,coverage_amount,covered_perils")

    # Geo-match
    raw_matches = find_matches(zone, locations, policies, event)
    if not raw_matches:
        return {"event_id": event_id, "status": "no_matches", "matches": 0}

    # Assign event_id and upsert matches
    for m in raw_matches:
        m["event_id"] = event_id
    db_matches = await db.upsert(
        "exposure_matches", raw_matches, on_conflict="event_id,policy_id,location_id"
    )

    # Get relevance rules
    relevance_rows = await db.select(
        "event_policy_relevance",
        params={"event_type": f"eq.{event['event_type']}"},
    )
    relevance_map = {r["policy_type"]: r for r in relevance_rows}

    # Estimate claims
    policy_map = {p["id"]: p for p in policies}
    estimates = []
    for m in db_matches:
        policy = policy_map.get(m["policy_id"], {})
        rel = relevance_map.get(policy.get("policy_type"), {
            "base_claim_rate": 0.1, "severity_multiplier": 1.0
        })
        est = estimate_claim(m, policy, rel, event, zone)
        est["exposure_match_id"] = m["id"]
        estimates.append(est)

    if estimates:
        await db.upsert("claim_estimates", estimates, on_conflict="exposure_match_id")

    # Generate alert
    alert_data = generate_alert(estimates, total_policies=len(db_matches))
    alert_data["event_id"] = event_id
    await db.upsert("alerts", [alert_data], on_conflict="event_id")

    return {
        "event_id": event_id,
        "status": "processed",
        "matches": len(db_matches),
        "claims_estimated": len(estimates),
        "alert_level": alert_data["alert_level"],
    }


@router.post("/pipeline/run")
async def run_pipeline():
    # Step 1: Run extraction
    extraction_output = await _run_extraction()

    # Step 2: Get all events
    events = await db.select("events", params={"order": "detected_at.desc", "limit": "100"})

    # Step 3: Process each event
    results = []
    for event in events:
        try:
            result = await _process_event(event)
            results.append(result)
        except Exception as e:
            results.append({"event_id": event["id"], "status": "error", "error": str(e)})

    processed = sum(1 for r in results if r.get("status") == "processed")
    return {
        "extraction_output": extraction_output[-500:],  # last 500 chars
        "events_found": len(events),
        "events_processed": processed,
        "results": results,
    }
```

- [ ] **Step 5: Write router smoke tests**

```python
"""Smoke tests for API routers using FastAPI test client."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestHealth:
    def test_health_check(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
```

- [ ] **Step 6: Run all backend tests**

```bash
cd services/backend && python -m pytest tests/ -v
```

- [ ] **Step 7: Commit**

```bash
git add services/backend/src/backend/routers/ services/backend/tests/test_routers.py
git commit -m "feat(backend): add API routers (events, alerts, dashboard, pipeline)"
```

---

### Task 7: Verify backend starts

- [ ] **Step 1: Test server startup**

```bash
cd services/backend && timeout 5 python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 || true
```

Expected: server starts, then times out after 5 seconds. Should see "Uvicorn running on http://0.0.0.0:8001".

- [ ] **Step 2: Final commit with all backend files**

```bash
cd /path/to/hackathon && git add services/backend/
git commit -m "feat(backend): complete FastAPI backend with geo-matching, claims, and alerts

- Supabase PostgREST client wrapper
- Geo-matching engine (radius, bbox, admin_area)
- Claim estimation with distance decay formula
- Alert generation with 4 severity levels
- REST API: events, alerts, dashboard summary, pipeline runner
- Full test suite"
```
