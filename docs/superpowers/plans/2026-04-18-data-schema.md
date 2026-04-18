# Data Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the full PostgreSQL schema (9 tables), reference data seeds, and a mock policyholder data generator so the entire team has a shared database to build against.

**Architecture:** A new `services/database/` directory containing SQL migrations, Python seed scripts, and a README. The migration creates all tables in one file (they're interdependent via FKs). The seed generator uses `faker` to produce ~500 realistic policyholders distributed across disaster-prone regions. Reference data (`event_policy_relevance`) is seeded via a separate SQL file.

**Tech Stack:** PostgreSQL (Supabase), Python 3.11+, Faker library for mock data generation.

**Spec:** `docs/superpowers/specs/2026-04-18-data-schema-design.md`

---

## File Structure

```
services/database/
├── pyproject.toml                    # Package config (faker dep)
├── README.md                         # Setup and usage instructions
├── migrations/
│   └── 001_create_schema.sql         # DDL for all 9 tables + indexes
├── seeds/
│   ├── __init__.py                   # Makes seeds importable for tests
│   ├── 002_reference_data.sql        # event_policy_relevance seed rows
│   └── generate_mock_data.py         # Python script → outputs 003_mock_data.sql
└── tests/
    └── test_generate_mock_data.py    # Validates generated SQL shape
```

---

### Task 1: Create SQL migration for all tables

**Files:**
- Create: `services/database/migrations/001_create_schema.sql`

- [ ] **Step 1: Write the events table DDL**

Create the file with the `events` table and its indexes:

```sql
-- 001_create_schema.sql
-- Full schema for the insurance early-warning system.
-- Run against a PostgreSQL 15+ database (Supabase compatible).

BEGIN;

-- ============================================================
-- EVENT DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_id    text UNIQUE NOT NULL,
    source          text NOT NULL,
    event_family    text NOT NULL CHECK (event_family IN ('natural', 'human_caused')),
    event_type      text NOT NULL,
    event_subtype   text,
    title           text NOT NULL,
    summary         text,
    severity_label  text NOT NULL CHECK (severity_label IN ('minor','moderate','major','severe','critical')),
    severity_score  int  NOT NULL CHECK (severity_score BETWEEN 0 AND 100),
    status          text NOT NULL DEFAULT 'unknown' CHECK (status IN ('active','ended','unknown')),
    occurred_at     timestamptz,
    detected_at     timestamptz NOT NULL,
    geometry_type   text NOT NULL CHECK (geometry_type IN ('point','bbox','admin_area','polygon')),
    latitude        double precision CHECK (latitude BETWEEN -90 AND 90),
    longitude       double precision CHECK (longitude BETWEEN -180 AND 180),
    bbox            double precision[],
    region_name     text,
    country_codes   text[] DEFAULT '{}',
    severity_inputs jsonb DEFAULT '{}',
    source_url      text,
    schema_version  text NOT NULL DEFAULT 'v1',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_occurred ON events (occurred_at DESC);
CREATE INDEX idx_events_location ON events (latitude, longitude);
```

- [ ] **Step 2: Add the impact_zones table**

Append to the same file:

```sql
CREATE TABLE IF NOT EXISTS impact_zones (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    zone_type    text NOT NULL CHECK (zone_type IN ('radius', 'bbox', 'admin_area')),
    center_lat   double precision,
    center_lon   double precision,
    radius_km    double precision,
    bbox         double precision[],
    admin_region text,
    country_code text,
    computed_at  timestamptz DEFAULT now()
);
```

- [ ] **Step 3: Add the insurance domain tables (policyholders, policies, insured_locations)**

Append to the same file:

```sql
-- ============================================================
-- INSURANCE DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS policyholders (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    type       text NOT NULL CHECK (type IN ('individual', 'business')),
    email      text,
    phone      text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policyholder_id   uuid NOT NULL REFERENCES policyholders(id) ON DELETE CASCADE,
    policy_number     text UNIQUE NOT NULL,
    policy_type       text NOT NULL CHECK (policy_type IN ('property','auto','life','health','commercial','liability')),
    status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    coverage_amount   numeric NOT NULL,
    deductible        numeric NOT NULL DEFAULT 0,
    premium_annual    numeric NOT NULL,
    effective_date    date NOT NULL,
    expiry_date       date NOT NULL,
    covered_perils    text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_policies_holder ON policies (policyholder_id);
CREATE INDEX idx_policies_type ON policies (policy_type);

CREATE TABLE IF NOT EXISTS insured_locations (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    label          text NOT NULL,
    latitude       double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude      double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    address        text,
    city           text,
    state_province text,
    country_code   text NOT NULL,
    property_value numeric
);

CREATE INDEX idx_locations_coords ON insured_locations (latitude, longitude);
CREATE INDEX idx_locations_country ON insured_locations (country_code);
```

- [ ] **Step 4: Add the linking domain tables (exposure_matches, claim_estimates, alerts)**

Append to the same file:

```sql
-- ============================================================
-- LINKING DOMAIN
-- ============================================================

CREATE TABLE IF NOT EXISTS exposure_matches (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    policy_id    uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    location_id  uuid NOT NULL REFERENCES insured_locations(id) ON DELETE CASCADE,
    distance_km  double precision,
    match_method text NOT NULL CHECK (match_method IN ('radius','bbox_overlap','admin_match')),
    matched_at   timestamptz DEFAULT now(),
    UNIQUE (event_id, policy_id, location_id)
);

CREATE INDEX idx_matches_event ON exposure_matches (event_id);
CREATE INDEX idx_matches_policy ON exposure_matches (policy_id);

CREATE TABLE IF NOT EXISTS claim_estimates (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exposure_match_id  uuid UNIQUE NOT NULL REFERENCES exposure_matches(id) ON DELETE CASCADE,
    claim_probability  double precision NOT NULL CHECK (claim_probability BETWEEN 0 AND 1),
    estimated_amount   numeric NOT NULL,
    risk_factors       jsonb NOT NULL,
    computed_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                 uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    alert_level              text NOT NULL CHECK (alert_level IN ('low','medium','high','critical')),
    total_policies_affected  int NOT NULL,
    estimated_claim_count    int NOT NULL,
    estimated_total_amount   numeric NOT NULL,
    recommended_action       text NOT NULL,
    generated_at             timestamptz DEFAULT now(),
    sent_via                 text[] DEFAULT '{}',
    sent_at                  timestamptz
);

CREATE INDEX idx_alerts_event ON alerts (event_id);
CREATE INDEX idx_alerts_level ON alerts (alert_level);
```

- [ ] **Step 5: Add the reference table and close the transaction**

Append to the same file:

```sql
-- ============================================================
-- REFERENCE DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS event_policy_relevance (
    event_type          text NOT NULL,
    policy_type         text NOT NULL,
    is_relevant         boolean NOT NULL,
    base_claim_rate     double precision NOT NULL,
    severity_multiplier double precision NOT NULL DEFAULT 1.0,
    PRIMARY KEY (event_type, policy_type)
);

COMMIT;
```

- [ ] **Step 6: Review the complete migration file**

Read the full file and verify:
- All 9 tables are present
- FK references point to correct tables
- CHECK constraints match the spec's enum values
- Indexes match the spec

- [ ] **Step 7: Commit**

```bash
git add services/database/migrations/001_create_schema.sql
git commit -m "feat(db): add schema migration for all 9 tables"
```

---

### Task 2: Seed the event_policy_relevance reference data

**Files:**
- Create: `services/database/seeds/002_reference_data.sql`

- [ ] **Step 1: Write the reference data SQL**

This covers all combinations of `event_type × policy_type` from the spec. Rows where `is_relevant = false` are included for completeness (the geo-matching engine can filter on `is_relevant = true`).

```sql
-- 002_reference_data.sql
-- Seed the event_policy_relevance lookup table.
-- Run AFTER 001_create_schema.sql.

BEGIN;

INSERT INTO event_policy_relevance (event_type, policy_type, is_relevant, base_claim_rate, severity_multiplier) VALUES
-- earthquake
('earthquake', 'property',   true,  0.35, 1.5),
('earthquake', 'auto',       true,  0.10, 1.2),
('earthquake', 'life',       true,  0.02, 2.0),
('earthquake', 'health',     true,  0.05, 1.8),
('earthquake', 'commercial', true,  0.30, 1.5),
('earthquake', 'liability',  true,  0.08, 1.3),
-- flood
('flood', 'property',   true,  0.40, 1.3),
('flood', 'auto',       true,  0.25, 1.3),
('flood', 'life',       false, 0.00, 1.0),
('flood', 'health',     false, 0.00, 1.0),
('flood', 'commercial', true,  0.35, 1.3),
('flood', 'liability',  true,  0.05, 1.1),
-- wildfire
('wildfire', 'property',   true,  0.50, 1.4),
('wildfire', 'auto',       true,  0.15, 1.2),
('wildfire', 'life',       false, 0.00, 1.0),
('wildfire', 'health',     true,  0.03, 1.5),
('wildfire', 'commercial', true,  0.40, 1.4),
('wildfire', 'liability',  false, 0.00, 1.0),
-- cyclone
('cyclone', 'property',   true,  0.45, 1.6),
('cyclone', 'auto',       true,  0.20, 1.3),
('cyclone', 'life',       true,  0.03, 2.0),
('cyclone', 'health',     true,  0.05, 1.5),
('cyclone', 'commercial', true,  0.40, 1.5),
('cyclone', 'liability',  true,  0.08, 1.2),
-- storm
('storm', 'property',   true,  0.30, 1.3),
('storm', 'auto',       true,  0.20, 1.2),
('storm', 'life',       false, 0.00, 1.0),
('storm', 'health',     false, 0.00, 1.0),
('storm', 'commercial', true,  0.25, 1.3),
('storm', 'liability',  false, 0.00, 1.0),
-- tornado
('tornado', 'property',   true,  0.55, 1.7),
('tornado', 'auto',       true,  0.30, 1.4),
('tornado', 'life',       true,  0.04, 2.2),
('tornado', 'health',     true,  0.06, 1.8),
('tornado', 'commercial', true,  0.45, 1.6),
('tornado', 'liability',  true,  0.10, 1.3),
-- tsunami
('tsunami', 'property',   true,  0.60, 1.8),
('tsunami', 'auto',       true,  0.25, 1.5),
('tsunami', 'life',       true,  0.08, 2.5),
('tsunami', 'health',     true,  0.10, 2.0),
('tsunami', 'commercial', true,  0.50, 1.7),
('tsunami', 'liability',  true,  0.10, 1.4),
-- volcano
('volcano', 'property',   true,  0.35, 1.5),
('volcano', 'auto',       true,  0.10, 1.2),
('volcano', 'life',       true,  0.03, 2.0),
('volcano', 'health',     true,  0.05, 1.8),
('volcano', 'commercial', true,  0.30, 1.4),
('volcano', 'liability',  false, 0.00, 1.0),
-- drought
('drought', 'property',   true,  0.10, 1.1),
('drought', 'auto',       false, 0.00, 1.0),
('drought', 'life',       false, 0.00, 1.0),
('drought', 'health',     false, 0.00, 1.0),
('drought', 'commercial', true,  0.15, 1.2),
('drought', 'liability',  false, 0.00, 1.0),
-- conflict
('conflict', 'property',   true,  0.40, 1.8),
('conflict', 'auto',       true,  0.20, 1.5),
('conflict', 'life',       true,  0.05, 2.5),
('conflict', 'health',     true,  0.08, 2.0),
('conflict', 'commercial', true,  0.35, 1.8),
('conflict', 'liability',  true,  0.12, 1.5),
-- terrorism
('terrorism', 'property',   true,  0.35, 2.0),
('terrorism', 'auto',       true,  0.15, 1.5),
('terrorism', 'life',       true,  0.06, 2.5),
('terrorism', 'health',     true,  0.10, 2.2),
('terrorism', 'commercial', true,  0.30, 2.0),
('terrorism', 'liability',  true,  0.15, 1.8),
-- industrial
('industrial', 'property',   true,  0.30, 1.5),
('industrial', 'auto',       true,  0.05, 1.1),
('industrial', 'life',       true,  0.03, 2.0),
('industrial', 'health',     true,  0.15, 2.0),
('industrial', 'commercial', true,  0.35, 1.6),
('industrial', 'liability',  true,  0.25, 1.8),
-- other
('other', 'property',   true,  0.10, 1.0),
('other', 'auto',       true,  0.05, 1.0),
('other', 'life',       false, 0.00, 1.0),
('other', 'health',     false, 0.00, 1.0),
('other', 'commercial', true,  0.10, 1.0),
('other', 'liability',  false, 0.00, 1.0)
ON CONFLICT (event_type, policy_type) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Verify row count**

Count: 13 event types × 6 policy types = 78 rows. Verify the SQL has 78 value tuples.

- [ ] **Step 3: Commit**

```bash
git add services/database/seeds/002_reference_data.sql
git commit -m "feat(db): add event_policy_relevance seed data (78 rows)"
```

---

### Task 3: Create the mock data generator

**Files:**
- Create: `services/database/pyproject.toml`
- Create: `services/database/seeds/generate_mock_data.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "database-seeds"
version = "0.1.0"
description = "Mock data generator for the insurance early-warning schema"
requires-python = ">=3.11"
dependencies = [
    "faker>=33.0,<34",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0,<9",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 2: Install dependencies**

```bash
cd services/database && pip install -e ".[dev]"
```

- [ ] **Step 2b: Create seeds/__init__.py**

```bash
touch services/database/seeds/__init__.py
```

- [ ] **Step 3: Write the region configuration**

Create `services/database/seeds/generate_mock_data.py` starting with the region definitions. Each region defines a lat/lon bounding box and how many policyholders to generate there:

```python
"""Generate mock policyholder/policy/location data as SQL INSERT statements.

Usage:
    python seeds/generate_mock_data.py > seeds/003_mock_data.sql
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta

from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)


# ── Region config ──────────────────────────────────────────────────────────

@dataclass
class Region:
    name: str
    country_code: str
    lat_range: tuple[float, float]
    lon_range: tuple[float, float]
    count: int
    cities: list[str] = field(default_factory=list)


REGIONS = [
    Region("California", "US", (32.5, 42.0), (-124.5, -114.0), 100,
           ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"]),
    Region("Florida", "US", (24.5, 31.0), (-87.6, -79.8), 100,
           ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"]),
    Region("Japan", "JP", (30.0, 45.5), (129.5, 145.8), 80,
           ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Kobe"]),
    Region("Southeast Asia", "TH", (1.0, 20.0), (97.0, 122.0), 80,
           ["Bangkok", "Manila", "Jakarta", "Ho Chi Minh City", "Kuala Lumpur"]),
    Region("Europe", "DE", (36.0, 60.0), (-10.0, 30.0), 70,
           ["London", "Paris", "Berlin", "Madrid", "Rome"]),
    Region("Middle East", "IQ", (12.0, 42.0), (25.0, 60.0), 40,
           ["Baghdad", "Beirut", "Damascus", "Riyadh", "Istanbul"]),
    Region("Other", "AU", (-45.0, 65.0), (-170.0, 170.0), 30,
           ["Sydney", "São Paulo", "Lagos", "Mumbai", "Toronto"]),
]

# Country codes vary within multi-country regions
_SOUTHEAST_ASIA_CODES = ["TH", "PH", "ID", "VN", "MY"]
_EUROPE_CODES = ["GB", "FR", "DE", "ES", "IT", "NL", "SE"]
_MIDDLE_EAST_CODES = ["IQ", "LB", "SY", "SA", "TR", "AE"]
_OTHER_CODES = ["AU", "BR", "NG", "IN", "CA", "MX"]


def _country_for_region(region: Region) -> str:
    if region.name == "Southeast Asia":
        return random.choice(_SOUTHEAST_ASIA_CODES)
    if region.name == "Europe":
        return random.choice(_EUROPE_CODES)
    if region.name == "Middle East":
        return random.choice(_MIDDLE_EAST_CODES)
    if region.name == "Other":
        return random.choice(_OTHER_CODES)
    return region.country_code
```

- [ ] **Step 4: Add the policy generation logic**

Append to the same file. This defines what types of policies each policyholder gets and the covered perils per policy type:

```python
# ── Policy type config ─────────────────────────────────────────────────────

POLICY_TYPES = ["property", "auto", "life", "health", "commercial", "liability"]

COVERED_PERILS: dict[str, list[str]] = {
    "property":   ["earthquake", "flood", "wildfire", "storm", "cyclone", "tornado", "tsunami", "volcano"],
    "auto":       ["flood", "storm", "cyclone", "tornado"],
    "life":       ["earthquake", "flood", "cyclone", "conflict", "terrorism", "tsunami"],
    "health":     ["earthquake", "wildfire", "cyclone", "conflict", "terrorism", "industrial"],
    "commercial": ["earthquake", "flood", "wildfire", "storm", "conflict", "industrial", "tornado", "tsunami"],
    "liability":  ["earthquake", "cyclone", "tornado", "conflict", "terrorism", "industrial"],
}

COVERAGE_RANGES: dict[str, tuple[int, int]] = {
    "property":   (100_000, 2_000_000),
    "auto":       (10_000, 80_000),
    "life":       (50_000, 1_000_000),
    "health":     (20_000, 500_000),
    "commercial": (500_000, 10_000_000),
    "liability":  (100_000, 5_000_000),
}

DEDUCTIBLE_RANGES: dict[str, tuple[int, int]] = {
    "property":   (1_000, 25_000),
    "auto":       (250, 2_000),
    "life":       (0, 0),
    "health":     (500, 10_000),
    "commercial": (5_000, 100_000),
    "liability":  (1_000, 50_000),
}


def _random_lat_lon(region: Region) -> tuple[float, float]:
    lat = round(random.uniform(*region.lat_range), 6)
    lon = round(random.uniform(*region.lon_range), 6)
    return lat, lon


def _random_coverage(policy_type: str) -> tuple[float, float, float]:
    cov_lo, cov_hi = COVERAGE_RANGES[policy_type]
    ded_lo, ded_hi = DEDUCTIBLE_RANGES[policy_type]
    coverage = round(random.uniform(cov_lo, cov_hi), 2)
    deductible = round(random.uniform(ded_lo, ded_hi), 2)
    premium = round(coverage * random.uniform(0.005, 0.03), 2)
    return coverage, deductible, premium


def _random_dates() -> tuple[date, date]:
    start = date(2025, 1, 1) + timedelta(days=random.randint(0, 365))
    end = start + timedelta(days=365)
    return start, end
```

- [ ] **Step 5: Add the SQL generation and main function**

Append to the same file:

```python
# ── SQL generation ─────────────────────────────────────────────────────────


def _sql_escape(value: str) -> str:
    return value.replace("'", "''")


def generate() -> str:
    lines: list[str] = [
        "-- 003_mock_data.sql",
        "-- Auto-generated mock policyholder data.",
        "-- Run AFTER 001_create_schema.sql and 002_reference_data.sql.",
        "",
        "BEGIN;",
        "",
    ]

    policy_counter = 0

    for region in REGIONS:
        lines.append(f"-- Region: {region.name} ({region.count} policyholders)")

        for _ in range(region.count):
            # Policyholder
            ph_id = str(uuid.uuid4())
            is_business = random.random() < 0.25
            ph_type = "business" if is_business else "individual"
            ph_name = fake.company() if is_business else fake.name()
            ph_email = fake.email()
            ph_phone = fake.phone_number()[:20]

            lines.append(
                f"INSERT INTO policyholders (id, name, type, email, phone) VALUES "
                f"('{ph_id}', '{_sql_escape(ph_name)}', '{ph_type}', "
                f"'{_sql_escape(ph_email)}', '{_sql_escape(ph_phone)}');"
            )

            # Each policyholder gets 1-3 policies
            num_policies = random.choices([1, 2, 3], weights=[0.3, 0.5, 0.2])[0]
            chosen_types = random.sample(POLICY_TYPES, min(num_policies, len(POLICY_TYPES)))

            for pt in chosen_types:
                policy_counter += 1
                pol_id = str(uuid.uuid4())
                pol_num = f"POL-2025-{policy_counter:05d}"
                coverage, deductible, premium = _random_coverage(pt)
                eff_date, exp_date = _random_dates()
                perils = COVERED_PERILS[pt]
                perils_sql = "'{" + ",".join(perils) + "}'"

                lines.append(
                    f"INSERT INTO policies (id, policyholder_id, policy_number, policy_type, "
                    f"status, coverage_amount, deductible, premium_annual, effective_date, "
                    f"expiry_date, covered_perils) VALUES "
                    f"('{pol_id}', '{ph_id}', '{pol_num}', '{pt}', 'active', "
                    f"{coverage}, {deductible}, {premium}, '{eff_date}', '{exp_date}', "
                    f"{perils_sql});"
                )

                # Each policy gets 1-2 insured locations
                num_locations = 1 if pt in ("life", "health", "auto") else random.choice([1, 2])
                for loc_idx in range(num_locations):
                    loc_id = str(uuid.uuid4())
                    lat, lon = _random_lat_lon(region)
                    country = _country_for_region(region)
                    city = random.choice(region.cities) if region.cities else ""
                    label = "Primary" if loc_idx == 0 else f"Location #{loc_idx + 1}"
                    prop_value = round(coverage * random.uniform(0.6, 1.5), 2) if pt in ("property", "commercial") else "NULL"

                    lines.append(
                        f"INSERT INTO insured_locations (id, policy_id, label, latitude, "
                        f"longitude, city, country_code, property_value) VALUES "
                        f"('{loc_id}', '{pol_id}', '{label}', {lat}, {lon}, "
                        f"'{_sql_escape(city)}', '{country}', {prop_value});"
                    )

        lines.append("")

    lines.append("COMMIT;")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    print(generate())
```

- [ ] **Step 6: Run the generator and inspect output**

```bash
cd services/database && python seeds/generate_mock_data.py > seeds/003_mock_data.sql
wc -l seeds/003_mock_data.sql
head -30 seeds/003_mock_data.sql
tail -5 seeds/003_mock_data.sql
```

Expected: a SQL file with ~2000-3000 lines of INSERT statements, starting with `BEGIN;` and ending with `COMMIT;`.

- [ ] **Step 7: Commit**

```bash
git add services/database/pyproject.toml services/database/seeds/
git commit -m "feat(db): add reference data seed and mock data generator"
```

---

### Task 4: Write tests for the mock data generator

**Files:**
- Create: `services/database/tests/__init__.py`
- Create: `services/database/tests/test_generate_mock_data.py`

- [ ] **Step 1: Write tests**

```python
"""Tests for the mock data generator."""

from seeds.generate_mock_data import generate, REGIONS, POLICY_TYPES, COVERED_PERILS


class TestGenerate:
    def test_output_is_valid_sql_transaction(self):
        sql = generate()
        assert sql.startswith("-- 003_mock_data.sql")
        assert "BEGIN;" in sql
        assert sql.strip().endswith("COMMIT;")

    def test_correct_total_policyholders(self):
        sql = generate()
        expected_count = sum(r.count for r in REGIONS)
        actual_count = sql.count("INSERT INTO policyholders")
        assert actual_count == expected_count, f"Expected {expected_count}, got {actual_count}"

    def test_every_policyholder_has_at_least_one_policy(self):
        sql = generate()
        ph_count = sql.count("INSERT INTO policyholders")
        pol_count = sql.count("INSERT INTO policies")
        assert pol_count >= ph_count, "Every policyholder should have >= 1 policy"

    def test_every_policy_has_at_least_one_location(self):
        sql = generate()
        pol_count = sql.count("INSERT INTO policies")
        loc_count = sql.count("INSERT INTO insured_locations")
        assert loc_count >= pol_count, "Every policy should have >= 1 location"

    def test_all_policy_types_used(self):
        sql = generate()
        for pt in POLICY_TYPES:
            assert f"'{pt}'" in sql, f"Policy type '{pt}' not found in output"

    def test_covered_perils_format(self):
        sql = generate()
        # Perils should be formatted as PostgreSQL text arrays
        for pt, perils in COVERED_PERILS.items():
            for peril in perils:
                assert peril in sql, f"Peril '{peril}' not in output"

    def test_deterministic_output(self):
        sql1 = generate()
        sql2 = generate()
        assert sql1 == sql2, "Output should be deterministic (seeded random)"
```

- [ ] **Step 2: Run the tests**

```bash
cd services/database && python -m pytest tests/ -v
```

Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/database/tests/
git commit -m "test(db): add mock data generator tests"
```

---

### Task 5: Create the README

**Files:**
- Create: `services/database/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Database Schema & Seeds

SQL migrations and mock data for the insurance early-warning system.
Designed for PostgreSQL 15+ (Supabase).

## Quick Start

### 1. Run the migration

In the Supabase SQL Editor (or via `psql`), execute:

```sql
-- Creates all 9 tables with indexes and constraints
\i migrations/001_create_schema.sql
```

### 2. Seed reference data

```sql
-- Populates the event_policy_relevance lookup table (78 rows)
\i seeds/002_reference_data.sql
```

### 3. Generate and load mock data

```bash
# Install generator dependencies
pip install -e .

# Generate the SQL file (~500 policyholders, ~1000 policies, ~1200 locations)
python seeds/generate_mock_data.py > seeds/003_mock_data.sql
```

Then run `003_mock_data.sql` in Supabase or via `psql`.

### 4. Verify

```sql
SELECT 'policyholders' AS tbl, count(*) FROM policyholders
UNION ALL SELECT 'policies', count(*) FROM policies
UNION ALL SELECT 'insured_locations', count(*) FROM insured_locations
UNION ALL SELECT 'event_policy_relevance', count(*) FROM event_policy_relevance;
```

Expected: ~500 policyholders, ~1000 policies, ~1200 locations, 78 relevance rules.

## Schema Overview

| Table | Domain | Purpose |
|-------|--------|---------|
| events | Event | Persisted disaster events from extraction layer |
| impact_zones | Event | Computed impact area per event |
| policyholders | Insurance | People/orgs holding policies |
| policies | Insurance | Insurance contracts with type and coverage |
| insured_locations | Insurance | Geo-located assets tied to policies |
| exposure_matches | Linking | Junction: event × affected policy |
| claim_estimates | Linking | Per-match claim probability and amount |
| alerts | Linking | Aggregated per-event assessment |
| event_policy_relevance | Reference | Scoring rules: event_type × policy_type |

See `docs/superpowers/specs/2026-04-18-data-schema-design.md` for the full design spec.
```

- [ ] **Step 2: Commit**

```bash
git add services/database/README.md
git commit -m "docs(db): add database schema README"
```

---

### Task 6: Full integration validation

- [ ] **Step 1: Verify all files exist**

```bash
find services/database -type f | sort
```

Expected:
```
services/database/README.md
services/database/migrations/001_create_schema.sql
services/database/pyproject.toml
services/database/seeds/002_reference_data.sql
services/database/seeds/003_mock_data.sql
services/database/seeds/generate_mock_data.py
services/database/tests/__init__.py
services/database/tests/test_generate_mock_data.py
```

- [ ] **Step 2: Run the full test suite (both services)**

```bash
cd services/database && python -m pytest tests/ -v
cd ../extraction_normalization && python -m pytest tests/ -v
```

Expected: all database tests pass, all 66 extraction tests still pass.

- [ ] **Step 3: Validate migration SQL syntax**

Use Python's `sqlparse` or just scan for common errors:

```bash
# Quick syntax check — look for mismatched parens and missing semicolons
grep -c "CREATE TABLE" services/database/migrations/001_create_schema.sql
grep -c "CREATE INDEX" services/database/migrations/001_create_schema.sql
```

Expected: 9 CREATE TABLE statements, 10 CREATE INDEX statements.

- [ ] **Step 4: Validate mock data SQL references correct tables**

```bash
grep -c "INSERT INTO policyholders" services/database/seeds/003_mock_data.sql
grep -c "INSERT INTO policies" services/database/seeds/003_mock_data.sql
grep -c "INSERT INTO insured_locations" services/database/seeds/003_mock_data.sql
```

Expected: ~500 policyholders, ~1000 policies, ~1200 locations.

- [ ] **Step 5: Final commit with all generated artifacts**

```bash
git add -A && git status
git commit -m "feat(db): complete database schema, seeds, and mock data

- 9-table PostgreSQL schema (event, insurance, linking domains)
- 78-row event_policy_relevance reference data
- Mock data generator: ~500 policyholders across 7 global regions
- Tests for generator determinism and completeness"
```
