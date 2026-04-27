"""Database initialisation — schema, reference data, and deterministic mock data."""
from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from backend.database import Database

# ---------------------------------------------------------------------------
# SQLite DDL (adapted from PostgreSQL 001_create_schema.sql)
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY,
    canonical_id    TEXT UNIQUE NOT NULL,
    source          TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    event_family    TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    event_subtype   TEXT,
    title           TEXT NOT NULL,
    summary         TEXT,
    severity_label  TEXT NOT NULL,
    severity_score  REAL NOT NULL,
    status          TEXT DEFAULT 'active',
    confidence      REAL,
    occurred_at     TEXT NOT NULL,
    updated_at      TEXT,
    detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
    geometry_type   TEXT DEFAULT 'point',
    latitude        REAL,
    longitude       REAL,
    bbox            TEXT,
    region_name     TEXT,
    country_codes   TEXT,
    is_mobile       BOOLEAN DEFAULT 0,
    trajectory_bounds TEXT,
    trajectory      TEXT,
    severity_inputs TEXT,
    source_url      TEXT,
    raw_payload_ref TEXT,
    normalized_at   TEXT NOT NULL,
    schema_version  TEXT DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_location ON events (latitude, longitude);

CREATE TABLE IF NOT EXISTS impact_zones (
    id                   TEXT PRIMARY KEY,
    event_id             TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    zone_type            TEXT NOT NULL,
    radius_km            REAL,
    bbox_json            TEXT,
    admin_regions        TEXT,
    estimated_population INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_impact_zones_event_id ON impact_zones(event_id);

CREATE TABLE IF NOT EXISTS policyholders (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('individual', 'business')),
    email      TEXT,
    phone      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policies (
    id                TEXT PRIMARY KEY,
    policyholder_id   TEXT NOT NULL REFERENCES policyholders(id) ON DELETE CASCADE,
    policy_number     TEXT UNIQUE NOT NULL,
    policy_type       TEXT NOT NULL CHECK (policy_type IN ('property','auto','life','health','commercial','liability')),
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    coverage_amount   REAL NOT NULL,
    deductible        REAL NOT NULL DEFAULT 0,
    premium_annual    REAL NOT NULL,
    effective_date    TEXT NOT NULL,
    expiry_date       TEXT NOT NULL,
    covered_perils    TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_policies_holder ON policies (policyholder_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies (policy_type);

CREATE TABLE IF NOT EXISTS insured_locations (
    id             TEXT PRIMARY KEY,
    policy_id      TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    label          TEXT NOT NULL,
    latitude       REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude      REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    address        TEXT,
    city           TEXT,
    state_province TEXT,
    country_code   TEXT NOT NULL,
    property_value REAL
);

CREATE INDEX IF NOT EXISTS idx_locations_coords ON insured_locations (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_country ON insured_locations (country_code);

CREATE TABLE IF NOT EXISTS exposure_matches (
    id           TEXT PRIMARY KEY,
    event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    policy_id    TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    location_id  TEXT NOT NULL REFERENCES insured_locations(id) ON DELETE CASCADE,
    distance_km  REAL,
    match_method TEXT NOT NULL CHECK (match_method IN ('radius','bbox_overlap','admin_match')),
    matched_at   TEXT DEFAULT (datetime('now')),
    UNIQUE (event_id, policy_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_event ON exposure_matches (event_id);
CREATE INDEX IF NOT EXISTS idx_matches_policy ON exposure_matches (policy_id);

CREATE TABLE IF NOT EXISTS claim_estimates (
    id                 TEXT PRIMARY KEY,
    exposure_match_id  TEXT UNIQUE NOT NULL REFERENCES exposure_matches(id) ON DELETE CASCADE,
    claim_probability  REAL NOT NULL CHECK (claim_probability BETWEEN 0 AND 1),
    estimated_amount   REAL NOT NULL,
    risk_factors       TEXT NOT NULL,
    computed_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
    id                       TEXT PRIMARY KEY,
    event_id                 TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    alert_level              TEXT NOT NULL CHECK (alert_level IN ('low','medium','high','critical')),
    total_policies_affected  INTEGER NOT NULL,
    estimated_claim_count    INTEGER NOT NULL,
    estimated_total_amount   REAL NOT NULL,
    recommended_action       TEXT NOT NULL,
    generated_at             TEXT DEFAULT (datetime('now')),
    sent_via                 TEXT DEFAULT '[]',
    sent_at                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_event ON alerts (event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts (alert_level);

CREATE TABLE IF NOT EXISTS event_policy_relevance (
    event_type          TEXT NOT NULL,
    policy_type         TEXT NOT NULL,
    is_relevant         INTEGER NOT NULL,
    base_claim_rate     REAL NOT NULL,
    severity_multiplier REAL NOT NULL DEFAULT 1.0,
    PRIMARY KEY (event_type, policy_type)
);
"""

# ---------------------------------------------------------------------------
# Reference data (from 002_reference_data.sql)
# ---------------------------------------------------------------------------
_REFERENCE_ROWS: list[tuple[str, str, int, float, float]] = [
    # earthquake
    ("earthquake", "property",   1, 0.35, 1.5),
    ("earthquake", "auto",       1, 0.10, 1.2),
    ("earthquake", "life",       1, 0.02, 2.0),
    ("earthquake", "health",     1, 0.05, 1.8),
    ("earthquake", "commercial", 1, 0.30, 1.5),
    ("earthquake", "liability",  1, 0.08, 1.3),
    # flood
    ("flood", "property",   1, 0.40, 1.3),
    ("flood", "auto",       1, 0.25, 1.3),
    ("flood", "life",       0, 0.00, 1.0),
    ("flood", "health",     0, 0.00, 1.0),
    ("flood", "commercial", 1, 0.35, 1.3),
    ("flood", "liability",  1, 0.05, 1.1),
    # wildfire
    ("wildfire", "property",   1, 0.50, 1.4),
    ("wildfire", "auto",       1, 0.15, 1.2),
    ("wildfire", "life",       0, 0.00, 1.0),
    ("wildfire", "health",     1, 0.03, 1.5),
    ("wildfire", "commercial", 1, 0.40, 1.4),
    ("wildfire", "liability",  0, 0.00, 1.0),
    # cyclone
    ("cyclone", "property",   1, 0.45, 1.6),
    ("cyclone", "auto",       1, 0.20, 1.3),
    ("cyclone", "life",       1, 0.03, 2.0),
    ("cyclone", "health",     1, 0.05, 1.5),
    ("cyclone", "commercial", 1, 0.40, 1.5),
    ("cyclone", "liability",  1, 0.08, 1.2),
    # storm
    ("storm", "property",   1, 0.30, 1.3),
    ("storm", "auto",       1, 0.20, 1.2),
    ("storm", "life",       0, 0.00, 1.0),
    ("storm", "health",     0, 0.00, 1.0),
    ("storm", "commercial", 1, 0.25, 1.3),
    ("storm", "liability",  0, 0.00, 1.0),
    # tornado
    ("tornado", "property",   1, 0.55, 1.7),
    ("tornado", "auto",       1, 0.30, 1.4),
    ("tornado", "life",       1, 0.04, 2.2),
    ("tornado", "health",     1, 0.06, 1.8),
    ("tornado", "commercial", 1, 0.45, 1.6),
    ("tornado", "liability",  1, 0.10, 1.3),
    # tsunami
    ("tsunami", "property",   1, 0.60, 1.8),
    ("tsunami", "auto",       1, 0.25, 1.5),
    ("tsunami", "life",       1, 0.08, 2.5),
    ("tsunami", "health",     1, 0.10, 2.0),
    ("tsunami", "commercial", 1, 0.50, 1.7),
    ("tsunami", "liability",  1, 0.10, 1.4),
    # volcano
    ("volcano", "property",   1, 0.35, 1.5),
    ("volcano", "auto",       1, 0.10, 1.2),
    ("volcano", "life",       1, 0.03, 2.0),
    ("volcano", "health",     1, 0.05, 1.8),
    ("volcano", "commercial", 1, 0.30, 1.4),
    ("volcano", "liability",  0, 0.00, 1.0),
    # drought
    ("drought", "property",   1, 0.10, 1.1),
    ("drought", "auto",       0, 0.00, 1.0),
    ("drought", "life",       0, 0.00, 1.0),
    ("drought", "health",     0, 0.00, 1.0),
    ("drought", "commercial", 1, 0.15, 1.2),
    ("drought", "liability",  0, 0.00, 1.0),
    # conflict
    ("conflict", "property",   1, 0.40, 1.8),
    ("conflict", "auto",       1, 0.20, 1.5),
    ("conflict", "life",       1, 0.05, 2.5),
    ("conflict", "health",     1, 0.08, 2.0),
    ("conflict", "commercial", 1, 0.35, 1.8),
    ("conflict", "liability",  1, 0.12, 1.5),
    # terrorism
    ("terrorism", "property",   1, 0.35, 2.0),
    ("terrorism", "auto",       1, 0.15, 1.5),
    ("terrorism", "life",       1, 0.06, 2.5),
    ("terrorism", "health",     1, 0.10, 2.2),
    ("terrorism", "commercial", 1, 0.30, 2.0),
    ("terrorism", "liability",  1, 0.15, 1.8),
    # industrial
    ("industrial", "property",   1, 0.30, 1.5),
    ("industrial", "auto",       1, 0.05, 1.1),
    ("industrial", "life",       1, 0.03, 2.0),
    ("industrial", "health",     1, 0.15, 2.0),
    ("industrial", "commercial", 1, 0.35, 1.6),
    ("industrial", "liability",  1, 0.25, 1.8),
    # other
    ("other", "property",   1, 0.10, 1.0),
    ("other", "auto",       1, 0.05, 1.0),
    ("other", "life",       0, 0.00, 1.0),
    ("other", "health",     0, 0.00, 1.0),
    ("other", "commercial", 1, 0.10, 1.0),
    ("other", "liability",  0, 0.00, 1.0),
]

# ---------------------------------------------------------------------------
# Peril mapping per policy type
# ---------------------------------------------------------------------------
_PERILS_BY_TYPE: dict[str, list[str]] = {
    "property":   ["earthquake", "flood", "wildfire", "storm", "cyclone", "tornado"],
    "auto":       ["flood", "storm", "cyclone", "tornado"],
    "life":       ["earthquake", "flood", "cyclone", "conflict", "terrorism"],
    "health":     ["earthquake", "flood", "cyclone"],
    "commercial": ["earthquake", "flood", "wildfire", "storm", "conflict", "industrial"],
    "liability":  ["earthquake", "flood", "conflict", "terrorism", "industrial"],
}

# ---------------------------------------------------------------------------
# Geographic regions for mock data
# ---------------------------------------------------------------------------
_REGIONS: list[dict] = [
    {"name": "US East",    "lat": (25, 42),   "lon": (-80, -74),  "cc": "US", "cities": ["Miami", "Atlanta", "New York", "Boston", "Charlotte"]},
    {"name": "US West",    "lat": (33, 48),   "lon": (-122, -118), "cc": "US", "cities": ["Los Angeles", "San Francisco", "Seattle", "Portland", "San Diego"]},
    {"name": "Europe",     "lat": (48, 52),   "lon": (-1, 13),    "cc": "GB", "cities": ["London", "Paris", "Berlin", "Amsterdam", "Brussels"]},
    {"name": "Japan",      "lat": (33, 36),   "lon": (135, 140),  "cc": "JP", "cities": ["Tokyo", "Osaka", "Kyoto", "Nagoya", "Yokohama"]},
    {"name": "SE Asia",    "lat": (-6, 14),   "lon": (100, 112),  "cc": "TH", "cities": ["Bangkok", "Singapore", "Jakarta", "Kuala Lumpur", "Manila"]},
    {"name": "India",      "lat": (19, 29),   "lon": (72, 77),    "cc": "IN", "cities": ["Mumbai", "Delhi", "Pune", "Ahmedabad", "Jaipur"]},
    {"name": "Australia",  "lat": (-37, -34), "lon": (144, 151),  "cc": "AU", "cities": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]},
]

_FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Dorothy", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
    "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah",
]

_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
    "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
    "Mitchell", "Carter", "Roberts",
]

_BUSINESS_NAMES = [
    "Apex Trading Co", "Summit Industries", "Pacific Holdings", "Metro Logistics",
    "Atlas Manufacturing", "Zenith Consulting", "Pioneer Tech", "Coastal Properties",
    "Vertex Solutions", "Nexus Group", "Quantum Corp", "Stellar Enterprises",
    "Meridian Partners", "Vanguard Systems", "Horizon Capital", "Liberty Works",
    "Frontier Dynamics", "Eclipse Corp", "Pinnacle Services", "Evergreen Ltd",
    "Cascade Ventures", "Titan Industries", "Phoenix Global", "Osprey Trading",
    "Crimson Holdings", "Silver Creek Inc", "Redwood Partners", "Cobalt Corp",
    "Sapphire Tech", "Onyx Solutions", "Ironclad Industries", "Beacon Enterprises",
    "Lighthouse Capital", "Emerald Group", "Opal Logistics", "Diamond Properties",
    "Topaz Manufacturing", "Ruby Consulting", "Amber Holdings", "Jade Partners",
    "Coral Dynamics", "Ivory Works", "Obsidian Corp", "Garnet Services",
    "Quartz Ventures", "Agate Trading", "Citrine Solutions", "Beryl Industries",
    "Jasper Global", "Tourmaline Inc",
]

_POLICY_TYPES = ["property", "auto", "life", "health", "commercial", "liability"]


def _make_uuid(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def _random_date(rng: random.Random, start_year: int = 2023, end_year: int = 2025) -> str:
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = (end - start).days
    return (start + timedelta(days=rng.randint(0, delta))).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Mock data generation
# ---------------------------------------------------------------------------
def _generate_mock_data(
    rng: random.Random,
) -> tuple[list[dict], list[dict], list[dict]]:
    """Return (policyholders, policies, locations) with deterministic random data."""
    policyholders: list[dict] = []
    policies: list[dict] = []
    locations: list[dict] = []

    # 50 individual holders
    for i in range(50):
        ph_id = _make_uuid(rng)
        first = rng.choice(_FIRST_NAMES)
        last = rng.choice(_LAST_NAMES)
        policyholders.append({
            "id": ph_id,
            "name": f"{first} {last}",
            "type": "individual",
            "email": f"{first.lower()}.{last.lower()}@example.com",
            "phone": f"+1-555-{rng.randint(1000, 9999):04d}",
        })

    # 50 business holders
    for i in range(50):
        ph_id = _make_uuid(rng)
        name = _BUSINESS_NAMES[i]
        policyholders.append({
            "id": ph_id,
            "name": name,
            "type": "business",
            "email": f"contact@{name.lower().replace(' ', '').replace('.', '')}.com",
            "phone": f"+1-800-{rng.randint(1000, 9999):04d}",
        })

    # ~200 policies (1-3 per holder)
    policy_num = 1000
    for ph in policyholders:
        n_policies = rng.randint(1, 3)
        for _ in range(n_policies):
            p_id = _make_uuid(rng)
            p_type = rng.choice(_POLICY_TYPES)
            perils = _PERILS_BY_TYPE[p_type]
            # Select a random subset of perils (at least 2)
            n_perils = rng.randint(2, len(perils))
            selected_perils = rng.sample(perils, n_perils)
            eff_date = _random_date(rng, 2023, 2024)
            exp_date = _random_date(rng, 2025, 2026)
            coverage = rng.choice([50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000])

            policies.append({
                "id": p_id,
                "policyholder_id": ph["id"],
                "policy_number": f"POL-{policy_num:06d}",
                "policy_type": p_type,
                "status": "active",
                "coverage_amount": coverage,
                "deductible": round(coverage * rng.uniform(0.01, 0.05), 2),
                "premium_annual": round(coverage * rng.uniform(0.005, 0.02), 2),
                "effective_date": eff_date,
                "expiry_date": exp_date,
                "covered_perils": json.dumps(selected_perils),
            })
            policy_num += 1

    # ~300 locations (1-2 per policy)
    for pol in policies:
        n_locs = rng.randint(1, 2)
        region = rng.choice(_REGIONS)
        for j in range(n_locs):
            loc_id = _make_uuid(rng)
            lat = round(rng.uniform(*region["lat"]), 6)
            lon = round(rng.uniform(*region["lon"]), 6)
            city = rng.choice(region["cities"])
            prop_value = rng.choice([100_000, 250_000, 500_000, 750_000, 1_000_000, 2_000_000])

            locations.append({
                "id": loc_id,
                "policy_id": pol["id"],
                "label": f"{city} {'Office' if j == 0 else 'Warehouse'}",
                "latitude": lat,
                "longitude": lon,
                "address": f"{rng.randint(1, 9999)} Main St",
                "city": city,
                "state_province": region["name"],
                "country_code": region["cc"],
                "property_value": prop_value,
            })

    return policyholders, policies, locations


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def init_database(db: Database) -> None:
    """Create schema, load reference data, and generate mock data if empty."""
    await db.executescript(SCHEMA_SQL)

    # Check for missing columns in existing database (Migration)
    columns_info = await db.fetch_all("PRAGMA table_info(events)")
    column_names = [col["name"] for col in columns_info]
    
    if "is_mobile" not in column_names:
        await db.execute("ALTER TABLE events ADD COLUMN is_mobile BOOLEAN DEFAULT 0")
    if "trajectory_bounds" not in column_names:
        await db.execute("ALTER TABLE events ADD COLUMN trajectory_bounds TEXT DEFAULT NULL")
    if "trajectory" not in column_names:
        await db.execute("ALTER TABLE events ADD COLUMN trajectory TEXT DEFAULT NULL")

    # Load reference data if empty
    existing = await db.fetch_one("SELECT COUNT(*) AS c FROM event_policy_relevance")
    if existing and existing["c"] == 0:
        for row in _REFERENCE_ROWS:
            await db.execute(
                "INSERT INTO event_policy_relevance "
                "(event_type, policy_type, is_relevant, base_claim_rate, severity_multiplier) "
                "VALUES (?, ?, ?, ?, ?)",
                row,
            )

    # Load mock data if empty
    existing = await db.fetch_one("SELECT COUNT(*) AS c FROM policyholders")
    if existing and existing["c"] == 0:
        rng = random.Random(42)
        policyholders, policies, locations = _generate_mock_data(rng)
        await db.insert_many("policyholders", policyholders)
        await db.insert_many("policies", policies)
        await db.insert_many("insured_locations", locations)

    # Load trajectory mock data if it exists and wasn't loaded
    trajectory_seed = Path(__file__).parent.parent.parent.parent / "database" / "seeds" / "004_trajectory_mock_data.sql"
    if trajectory_seed.exists():
        # Check if we already have mobile events to avoid duplicates
        existing_mobile = await db.fetch_one("SELECT COUNT(*) AS c FROM events WHERE is_mobile = 1")
        if existing_mobile and existing_mobile["c"] == 0:
            with open(trajectory_seed, "r") as f:
                await db.executescript(f.read())
