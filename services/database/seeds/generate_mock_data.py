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
