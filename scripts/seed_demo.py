#!/usr/bin/env python3
"""Seed dramatic demo data into the local SQLite database.

Inserts 15 major disaster events across all 6 policy regions, enriches
policy data with more realistic peril coverage, adds concentrated
insured locations near disaster epicenters, then runs geo-matching →
claim estimation → alert generation.

Usage:
    python3 scripts/seed_demo.py          # from project root
    python3 scripts/seed_demo.py --reset  # clear events/matches/alerts first
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# Resolve project root and database path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_PATH", str(PROJECT_ROOT / "data" / "insureshield.db"))

# Add backend to path so we can import its modules
sys.path.insert(0, str(PROJECT_ROOT / "services" / "backend" / "src"))

os.environ["DATABASE_PATH"] = DB_PATH

# ---------------------------------------------------------------------------
# 15 dramatic disaster scenarios placed on top of policy clusters
# ---------------------------------------------------------------------------
NOW = datetime.now(timezone.utc)

DEMO_EVENTS = [
    # --- JAPAN (lat 33-36, lon 135-140) ---
    {
        "canonical_id": "demo:jp-earthquake-osaka",
        "source": "demo", "source_event_id": "jp-eq-001",
        "event_family": "natural", "event_type": "earthquake",
        "title": "M7.2 Earthquake — Osaka-Kobe Region",
        "summary": "Devastating shallow M7.2 earthquake at 10km depth in the Osaka-Kobe metropolitan area. Major structural damage reported, multiple aftershocks M5+.",
        "severity_label": "critical", "severity_score": 95,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=3)).isoformat(),
        "detected_at": (NOW - timedelta(hours=3)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 34.69, "longitude": 135.50,
        "region_name": "Osaka, Japan", "country_codes": json.dumps(["JP"]),
        "severity_inputs": json.dumps({"magnitude": 7.2, "depth_km": 10}),
    },
    {
        "canonical_id": "demo:jp-tsunami-tokyo",
        "source": "demo", "source_event_id": "jp-ts-001",
        "event_family": "natural", "event_type": "tsunami",
        "title": "Tsunami Warning — Tokyo Bay & Pacific Coast",
        "summary": "Triggered by Osaka M7.2 earthquake. 4-6m wave heights expected along Pacific coast. Evacuation orders issued for Tokyo Bay, Yokohama, and Chiba.",
        "severity_label": "critical", "severity_score": 98,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=2, minutes=45)).isoformat(),
        "detected_at": (NOW - timedelta(hours=2, minutes=40)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 35.45, "longitude": 139.75,
        "region_name": "Tokyo Bay, Japan", "country_codes": json.dumps(["JP"]),
        "severity_inputs": json.dumps({"magnitude": 7.2, "wave_height_m": 5.2}),
    },
    # --- INDIA (lat 19-29, lon 72-77) ---
    {
        "canonical_id": "demo:in-cyclone-bengal",
        "source": "demo", "source_event_id": "in-cy-001",
        "event_family": "natural", "event_type": "cyclone",
        "title": "Cyclone Vayu — Category 4 Hits Gujarat Coast",
        "summary": "Extremely severe cyclonic storm with sustained winds of 220 km/h making landfall near Porbandar, Gujarat. Storm surge of 3-4m expected.",
        "severity_label": "severe", "severity_score": 85,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=6)).isoformat(),
        "detected_at": (NOW - timedelta(hours=8)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 21.64, "longitude": 69.60,
        "region_name": "Gujarat, India", "country_codes": json.dumps(["IN"]),
        "severity_inputs": json.dumps({"wind_speed_kph": 220, "alert_level": "Red"}),
    },
    {
        "canonical_id": "demo:in-flood-mumbai",
        "source": "demo", "source_event_id": "in-fl-001",
        "event_family": "natural", "event_type": "flood",
        "title": "Catastrophic Flooding — Mumbai Metropolitan Region",
        "summary": "Record 450mm rainfall in 24 hours causes severe urban flooding across Mumbai. Airport shut down, rail services suspended, 200,000+ displaced.",
        "severity_label": "major", "severity_score": 74,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=12)).isoformat(),
        "detected_at": (NOW - timedelta(hours=11)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 19.08, "longitude": 72.88,
        "region_name": "Mumbai, India", "country_codes": json.dumps(["IN"]),
        "severity_inputs": json.dumps({"rainfall_mm": 450}),
    },
    # --- USA (lat 25-48, lon -122 to -75) ---
    {
        "canonical_id": "demo:us-wildfire-la",
        "source": "demo", "source_event_id": "us-wf-001",
        "event_family": "natural", "event_type": "wildfire",
        "title": "Palisades Fire Complex — Greater Los Angeles",
        "summary": "Fast-moving wildfire driven by Santa Ana winds (80+ mph) has burned 45,000 acres across Pacific Palisades, Malibu, and Topanga Canyon. 100,000+ evacuated.",
        "severity_label": "major", "severity_score": 78,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=18)).isoformat(),
        "detected_at": (NOW - timedelta(hours=17)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 34.05, "longitude": -118.52,
        "region_name": "Los Angeles, California", "country_codes": json.dumps(["US"]),
        "severity_inputs": json.dumps({"magnitude": 45000, "alert_level": "acres"}),
    },
    {
        "canonical_id": "demo:us-earthquake-sf",
        "source": "demo", "source_event_id": "us-eq-001",
        "event_family": "natural", "event_type": "earthquake",
        "title": "M6.8 Earthquake — San Francisco Bay Area",
        "summary": "Strong M6.8 earthquake on Hayward Fault shakes San Francisco Bay Area. Significant infrastructure damage, bridge inspections underway.",
        "severity_label": "major", "severity_score": 73,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=5)).isoformat(),
        "detected_at": (NOW - timedelta(hours=5)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 37.78, "longitude": -122.42,
        "region_name": "San Francisco, California", "country_codes": json.dumps(["US"]),
        "severity_inputs": json.dumps({"magnitude": 6.8, "depth_km": 12}),
    },
    {
        "canonical_id": "demo:us-tornado-ok",
        "source": "demo", "source_event_id": "us-tn-001",
        "event_family": "natural", "event_type": "tornado",
        "title": "EF4 Tornado Outbreak — Oklahoma City Metro",
        "summary": "Violent EF4 tornado with 200+ mph winds tears through Moore and south Oklahoma City. Destruction path 2 miles wide, 30+ miles long.",
        "severity_label": "major", "severity_score": 68,
        "status": "ended",
        "occurred_at": (NOW - timedelta(hours=24)).isoformat(),
        "detected_at": (NOW - timedelta(hours=24)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 35.34, "longitude": -97.49,
        "region_name": "Oklahoma City, Oklahoma", "country_codes": json.dumps(["US"]),
        "severity_inputs": json.dumps({"wind_speed_kph": 320}),
    },
    # --- UK/EUROPE (lat 48-52, lon -1 to 13) ---
    {
        "canonical_id": "demo:uk-flood-london",
        "source": "demo", "source_event_id": "uk-fl-001",
        "event_family": "natural", "event_type": "flood",
        "title": "Thames Barrier Breach — Central London Flooding",
        "summary": "Storm surge overwhelms Thames Barrier during high tide. Central London districts flooded including Westminster, Southwark, and Canary Wharf.",
        "severity_label": "major", "severity_score": 72,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=8)).isoformat(),
        "detected_at": (NOW - timedelta(hours=7)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 51.50, "longitude": -0.12,
        "region_name": "London, United Kingdom", "country_codes": json.dumps(["GB"]),
        "severity_inputs": json.dumps({"rainfall_mm": 200}),
    },
    {
        "canonical_id": "demo:de-terrorism-berlin",
        "source": "demo", "source_event_id": "de-tr-001",
        "event_family": "human_caused", "event_type": "terrorism",
        "title": "Multiple Coordinated Attacks — Berlin City Center",
        "summary": "Coordinated attacks at three locations in central Berlin. Area on lockdown, security level raised to maximum across EU.",
        "severity_label": "severe", "severity_score": 80,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=2)).isoformat(),
        "detected_at": (NOW - timedelta(hours=2)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 52.52, "longitude": 13.40,
        "region_name": "Berlin, Germany", "country_codes": json.dumps(["DE"]),
        "severity_inputs": json.dumps({"casualties_reported": True}),
    },
    {
        "canonical_id": "demo:de-storm-hamburg",
        "source": "demo", "source_event_id": "de-st-001",
        "event_family": "natural", "event_type": "storm",
        "title": "Storm Xander — North Sea Batters Hamburg",
        "summary": "Intense extra-tropical cyclone with 130 km/h gusts causes severe flooding in Hamburg port area. Elbe at highest level in 50 years.",
        "severity_label": "moderate", "severity_score": 62,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=14)).isoformat(),
        "detected_at": (NOW - timedelta(hours=15)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 53.55, "longitude": 9.99,
        "region_name": "Hamburg, Germany", "country_codes": json.dumps(["DE"]),
        "severity_inputs": json.dumps({"wind_speed_kph": 130}),
    },
    # --- AUSTRALIA (lat -37 to -34, lon 144-151) ---
    {
        "canonical_id": "demo:au-cyclone-qld",
        "source": "demo", "source_event_id": "au-cy-001",
        "event_family": "natural", "event_type": "cyclone",
        "title": "Cyclone Marcia — Category 3 Hits Queensland",
        "summary": "Severe tropical cyclone makes landfall near Rockhampton with 185 km/h winds. Major damage to buildings, power out for 120,000 homes.",
        "severity_label": "major", "severity_score": 71,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=10)).isoformat(),
        "detected_at": (NOW - timedelta(hours=12)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": -34.70, "longitude": 149.50,
        "region_name": "New South Wales, Australia", "country_codes": json.dumps(["AU"]),
        "severity_inputs": json.dumps({"wind_speed_kph": 185}),
    },
    {
        "canonical_id": "demo:au-industrial-melbourne",
        "source": "demo", "source_event_id": "au-in-001",
        "event_family": "human_caused", "event_type": "industrial",
        "title": "Chemical Plant Explosion — Melbourne Western Suburbs",
        "summary": "Massive explosion at chemical storage facility in Altona. Toxic plume forces evacuation of 15km radius. 3 workers killed, 40+ injured.",
        "severity_label": "moderate", "severity_score": 64,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=4)).isoformat(),
        "detected_at": (NOW - timedelta(hours=4)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": -37.82, "longitude": 144.83,
        "region_name": "Melbourne, Australia", "country_codes": json.dumps(["AU"]),
        "severity_inputs": json.dumps({"affected_population": 50000}),
    },
    {
        "canonical_id": "demo:au-wildfire-sydney",
        "source": "demo", "source_event_id": "au-wf-001",
        "event_family": "natural", "event_type": "wildfire",
        "title": "Blue Mountains Bushfire — Greater Sydney Threat",
        "summary": "Out-of-control bushfire in Blue Mountains advancing toward western Sydney suburbs. 80,000 hectares burned, catastrophic fire conditions declared.",
        "severity_label": "major", "severity_score": 70,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=36)).isoformat(),
        "detected_at": (NOW - timedelta(hours=35)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": -33.87, "longitude": 150.70,
        "region_name": "Sydney, Australia", "country_codes": json.dumps(["AU"]),
        "severity_inputs": json.dumps({"magnitude": 80000, "alert_level": "acres"}),
    },
    # --- SE ASIA / Thailand (lat -6 to 14, lon 100-112) ---
    {
        "canonical_id": "demo:th-storm-bangkok",
        "source": "demo", "source_event_id": "th-st-001",
        "event_family": "natural", "event_type": "storm",
        "title": "Tropical Storm Noru — Bangkok Inundated",
        "summary": "Tropical storm brings 300mm rainfall to greater Bangkok over 48 hours. Chao Phraya river overflows, severe urban flooding across 12 districts.",
        "severity_label": "moderate", "severity_score": 60,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=20)).isoformat(),
        "detected_at": (NOW - timedelta(hours=22)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 13.76, "longitude": 100.50,
        "region_name": "Bangkok, Thailand", "country_codes": json.dumps(["TH"]),
        "severity_inputs": json.dumps({"wind_speed_kph": 95, "rainfall_mm": 300}),
    },
    {
        "canonical_id": "demo:mm-conflict-border",
        "source": "demo", "source_event_id": "mm-cf-001",
        "event_family": "human_caused", "event_type": "conflict",
        "title": "Armed Conflict Escalation — Myanmar-Thailand Border",
        "summary": "Intensified armed conflict in Kayin State forces 50,000+ refugees toward Thai border. Cross-border shelling reported near Mae Sot.",
        "severity_label": "major", "severity_score": 67,
        "status": "active",
        "occurred_at": (NOW - timedelta(hours=48)).isoformat(),
        "detected_at": (NOW - timedelta(hours=36)).isoformat(),
        "normalized_at": NOW.isoformat(),
        "geometry_type": "point",
        "latitude": 16.50, "longitude": 98.50,
        "region_name": "Kayin State, Myanmar", "country_codes": json.dumps(["MM", "TH"]),
        "severity_inputs": json.dumps({"casualties_reported": True, "affected_population": 50000}),
    },
]

# Impact zone radii by event type (same formula as extraction pipeline)
BASE_RADII = {
    "earthquake": 100, "flood": 50, "wildfire": 30, "tsunami": 200,
    "tornado": 20, "storm": 80, "cyclone": 150, "conflict": 40,
    "terrorism": 15, "industrial": 10, "volcanic_activity": 60, "other": 30,
}


async def seed_demo_data(reset: bool = False) -> None:
    from backend.database import Database
    from backend.db_init import init_database
    from backend.services.alert_generator import generate_alert
    from backend.services.claim_estimator import estimate_claim
    from backend.services.geo_matcher import find_matches

    db = Database(DB_PATH)
    await db.connect()
    await init_database(db)

    if reset:
        print("[seed] Clearing existing matches, estimates, alerts, demo events...")
        await db.execute("DELETE FROM claim_estimates")
        await db.execute("DELETE FROM exposure_matches")
        await db.execute("DELETE FROM alerts")
        await db.execute("DELETE FROM impact_zones WHERE event_id IN (SELECT id FROM events WHERE source = 'demo')")
        await db.execute("DELETE FROM events WHERE source = 'demo'")
        # Also clear extra locations from previous demo runs
        await db.execute("DELETE FROM insured_locations WHERE label LIKE 'Demo:%'")

    # -----------------------------------------------------------------
    # STEP 1: Enrich policy perils to be more realistic
    # -----------------------------------------------------------------
    print("[seed] Enriching policy covered_perils...")

    # Comprehensive peril sets by policy type (realistic for disaster-prone regions)
    FULL_PERILS = {
        "property":   ["earthquake", "flood", "wildfire", "storm", "cyclone", "tornado", "tsunami"],
        "auto":       ["flood", "storm", "cyclone", "tornado", "wildfire"],
        "life":       ["earthquake", "flood", "cyclone", "tsunami", "conflict", "terrorism"],
        "health":     ["earthquake", "flood", "cyclone", "tsunami", "terrorism", "industrial"],
        "commercial": ["earthquake", "flood", "wildfire", "storm", "cyclone", "tsunami", "conflict", "industrial"],
        "liability":  ["earthquake", "flood", "conflict", "terrorism", "industrial", "tsunami"],
    }

    policies = await db.fetch_all("SELECT id, policy_type FROM policies")
    for p in policies:
        perils = FULL_PERILS.get(p["policy_type"], [])
        await db.execute(
            "UPDATE policies SET covered_perils = ? WHERE id = ?",
            (json.dumps(perils), p["id"]),
        )
    print(f"  ✓ Updated covered_perils for {len(policies)} policies")

    # -----------------------------------------------------------------
    # STEP 2: Add concentrated insured locations near disaster epicenters
    # -----------------------------------------------------------------
    print("[seed] Adding concentrated locations near disaster zones...")

    random.seed(2026)

    # Epicenters where we want dense policy coverage
    EPICENTERS = [
        # (label_prefix, lat, lon, country, spread_deg, n_locations)
        ("Osaka Office", 34.69, 135.50, "JP", 0.5, 8),
        ("Tokyo Tower", 35.68, 139.69, "JP", 0.6, 10),
        ("Kobe Port", 34.69, 135.18, "JP", 0.3, 6),
        ("Yokohama HQ", 35.44, 139.64, "JP", 0.4, 8),
        ("Kyoto Center", 35.01, 135.77, "JP", 0.3, 5),
        ("Nagoya Hub", 35.18, 136.91, "JP", 0.4, 6),
        ("Chiba Coast", 35.61, 140.12, "JP", 0.3, 6),
        ("Mumbai Central", 19.08, 72.88, "IN", 0.4, 8),
        ("Delhi Office", 28.61, 77.23, "IN", 0.4, 6),
        ("Ahmedabad Hub", 23.02, 72.57, "IN", 0.3, 6),
        ("Pune Branch", 18.52, 73.86, "IN", 0.3, 5),
        ("LA Downtown", 34.05, -118.25, "US", 0.4, 10),
        ("SF Financial", 37.79, -122.40, "US", 0.4, 10),
        ("OKC Metro", 35.47, -97.52, "US", 0.3, 6),
        ("Houston Hub", 29.76, -95.37, "US", 0.3, 6),
        ("Miami Beach", 25.79, -80.19, "US", 0.3, 5),
        ("London City", 51.51, -0.08, "GB", 0.3, 10),
        ("Berlin Mitte", 52.52, 13.40, "GB", 0.4, 8),
        ("Hamburg Port", 53.55, 9.99, "GB", 0.3, 6),
        ("Frankfurt HQ", 50.11, 8.68, "GB", 0.3, 5),
        ("Paris Office", 48.86, 2.35, "GB", 0.3, 5),
        ("Melbourne CBD", -37.81, 144.96, "AU", 0.4, 10),
        ("Sydney CBD", -33.87, 151.21, "AU", 0.4, 10),
        ("Brisbane Hub", -27.47, 153.03, "AU", 0.3, 6),
        ("Perth West", -31.95, 115.86, "AU", 0.3, 5),
        ("Bangkok Siam", 13.75, 100.53, "TH", 0.4, 8),
        ("Chiang Mai", 18.79, 98.98, "TH", 0.3, 5),
        ("Jakarta Hub", -6.21, 106.85, "TH", 0.3, 5),
        ("Singapore CBD", 1.28, 103.85, "TH", 0.3, 5),
        ("Mae Sot Border", 16.71, 98.57, "TH", 0.2, 4),
    ]

    # Get active policy IDs
    active_policies = await db.fetch_all(
        "SELECT id, policy_type FROM policies WHERE status = 'active'"
    )
    new_locations = []
    policy_idx = 0

    for label_prefix, center_lat, center_lon, country, spread, n_locs in EPICENTERS:
        for i in range(n_locs):
            policy = active_policies[policy_idx % len(active_policies)]
            policy_idx += 1
            lat = center_lat + random.uniform(-spread, spread)
            lon = center_lon + random.uniform(-spread, spread)
            new_locations.append({
                "id": str(uuid4()),
                "policy_id": policy["id"],
                "label": f"Demo: {label_prefix} #{i+1}",
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "address": f"{label_prefix} Area",
                "city": label_prefix.split()[0],
                "country_code": country,
                "property_value": random.choice([500000, 750000, 1000000, 1500000, 2000000]),
            })

    await db.insert_many("insured_locations", new_locations)
    print(f"  ✓ Added {len(new_locations)} concentrated locations across {len(EPICENTERS)} epicenters")

    # -----------------------------------------------------------------
    # STEP 3: Add extra policyholders + policies for high-value coverage
    # -----------------------------------------------------------------
    print("[seed] Adding high-value corporate policyholders...")
    DEMO_CORPS = [
        ("Mitsubishi Heavy Industries", "JP", "commercial", 5_000_000),
        ("Toyota Insurance Trust", "JP", "property", 8_000_000),
        ("Sony Global Coverage", "JP", "liability", 3_000_000),
        ("Tata Group Holdings", "IN", "commercial", 6_000_000),
        ("Reliance Industries", "IN", "property", 7_000_000),
        ("Google US Operations", "US", "commercial", 10_000_000),
        ("Apple West Coast", "US", "property", 12_000_000),
        ("Tesla California", "US", "auto", 4_000_000),
        ("HSBC London", "GB", "commercial", 8_000_000),
        ("Siemens Europe", "GB", "commercial", 6_000_000),
        ("BHP Billiton", "AU", "commercial", 7_000_000),
        ("Westfield Group", "AU", "property", 5_000_000),
        ("CP Group Thailand", "TH", "commercial", 4_000_000),
        ("Bangkok Bank", "TH", "property", 3_000_000),
    ]

    CORP_PERILS = {
        "commercial": ["earthquake", "flood", "wildfire", "storm", "cyclone", "tsunami", "conflict", "industrial", "terrorism", "tornado"],
        "property": ["earthquake", "flood", "wildfire", "storm", "cyclone", "tsunami", "tornado"],
        "liability": ["earthquake", "flood", "conflict", "terrorism", "industrial", "tsunami"],
        "auto": ["flood", "storm", "cyclone", "tornado", "wildfire", "earthquake"],
    }

    # Map country → epicenters for placing corporate locations
    country_epicenters = {}
    for lbl, lat, lon, cc, sp, nl in EPICENTERS:
        country_epicenters.setdefault(cc, []).append((lat, lon, sp))

    for corp_name, country, policy_type, coverage in DEMO_CORPS:
        holder_id = str(uuid4())
        await db.insert("policyholders", {
            "id": holder_id, "name": corp_name,
            "type": "business", "email": f"risk@{corp_name.lower().replace(' ', '')}.com",
        })
        policy_id = str(uuid4())
        await db.insert("policies", {
            "id": policy_id,
            "policyholder_id": holder_id,
            "policy_number": f"DEMO-{corp_name[:3].upper()}-{random.randint(1000,9999)}",
            "policy_type": policy_type,
            "status": "active",
            "coverage_amount": coverage,
            "deductible": coverage * 0.02,
            "premium_annual": coverage * 0.015,
            "effective_date": "2025-01-01",
            "expiry_date": "2027-12-31",
            "covered_perils": json.dumps(CORP_PERILS.get(policy_type, [])),
        })

        # Place 3-6 locations for each corp at their country's epicenters
        epicenters = country_epicenters.get(country, [(0, 0, 0.5)])
        for j in range(random.randint(3, 6)):
            ep = epicenters[j % len(epicenters)]
            await db.insert("insured_locations", {
                "id": str(uuid4()),
                "policy_id": policy_id,
                "label": f"Demo: {corp_name} Site #{j+1}",
                "latitude": round(ep[0] + random.uniform(-ep[2], ep[2]), 6),
                "longitude": round(ep[1] + random.uniform(-ep[2], ep[2]), 6),
                "address": f"{corp_name} Facility",
                "city": corp_name.split()[0],
                "country_code": country,
                "property_value": coverage * 0.3,
            })

    print(f"  ✓ Added {len(DEMO_CORPS)} corporate policyholders with high-value coverage")

    # Insert demo events
    print(f"[seed] Inserting {len(DEMO_EVENTS)} demo disaster events...")
    for ev in DEMO_EVENTS:
        event_id = str(uuid4())
        ev_row = {"id": event_id, "schema_version": "v1", **ev}
        await db.upsert("events", [ev_row], conflict_columns=["canonical_id"])

        # Compute and insert impact zone
        base = BASE_RADII.get(ev["event_type"], 30)
        radius = base * (1 + ev["severity_score"] / 50)
        zone = {
            "id": str(uuid4()),
            "event_id": event_id,
            "zone_type": "point",
            "radius_km": round(radius, 1),
        }
        if ev.get("region_name"):
            zone["admin_regions"] = json.dumps([ev["region_name"]])

        # Re-fetch event_id in case it was an upsert to existing
        existing = await db.fetch_one(
            "SELECT id FROM events WHERE canonical_id = ?", (ev["canonical_id"],)
        )
        actual_event_id = existing["id"] if existing else event_id
        zone["event_id"] = actual_event_id

        await db.upsert("impact_zones", [zone], conflict_columns=["event_id"])
        print(f"  ✓ {ev['title']} (severity: {ev['severity_score']}, radius: {radius:.0f}km)")

    # Run geo-matching pipeline on ALL events (including demo)
    print("\n[seed] Running geo-matching pipeline...")
    events = await db.fetch_all("SELECT * FROM events ORDER BY severity_score DESC")
    locations = await db.fetch_all(
        "SELECT id, policy_id, latitude, longitude, country_code FROM insured_locations"
    )
    policies = await db.fetch_all(
        "SELECT id, policy_type, coverage_amount, covered_perils FROM policies WHERE status = 'active'"
    )
    relevance_all = await db.fetch_all("SELECT * FROM event_policy_relevance")
    relevance_by_type = {}
    for r in relevance_all:
        relevance_by_type.setdefault(r["event_type"], {})[r["policy_type"]] = r

    total_matches = 0
    total_alerts = 0
    policy_map = {p["id"]: p for p in policies}

    for event in events:
        event_id = event["id"]
        zone = await db.fetch_one(
            "SELECT * FROM impact_zones WHERE event_id = ?", (event_id,)
        )
        if not zone:
            continue

        raw_matches = find_matches(zone, locations, policies, event)
        if not raw_matches:
            continue

        for m in raw_matches:
            m["event_id"] = event_id

        db_matches = await db.upsert(
            "exposure_matches", raw_matches,
            conflict_columns=["event_id", "policy_id", "location_id"],
        )
        total_matches += len(db_matches)

        rel_map = relevance_by_type.get(event["event_type"], {})
        estimates = []
        for m in db_matches:
            policy = policy_map.get(m["policy_id"], {})
            rel = rel_map.get(
                policy.get("policy_type"),
                {"base_claim_rate": 0.1, "severity_multiplier": 1.0},
            )
            est = estimate_claim(m, policy, rel, event, zone)
            est["exposure_match_id"] = m["id"]
            estimates.append(est)

        if estimates:
            await db.upsert(
                "claim_estimates", estimates,
                conflict_columns=["exposure_match_id"],
            )

        alert_data = generate_alert(estimates, total_policies=len(db_matches))
        alert_data["event_id"] = event_id
        await db.upsert("alerts", [alert_data], conflict_columns=["event_id"])
        total_alerts += 1

        level = alert_data["alert_level"]
        emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}[level]
        print(
            f"  {emoji} {event['title'][:50]:50s} "
            f"| {level:8s} | {len(db_matches):3d} policies | "
            f"${alert_data['estimated_total_amount']:>12,.2f}"
        )

    # Summary
    counts = await db.fetch_one("""
        SELECT
            (SELECT COUNT(*) FROM events) as events,
            (SELECT COUNT(*) FROM alerts) as alerts,
            (SELECT COUNT(*) FROM alerts WHERE alert_level IN ('high','critical')) as active,
            (SELECT COUNT(*) FROM exposure_matches) as matches,
            (SELECT COALESCE(SUM(estimated_total_amount),0) FROM alerts) as total_amount
    """)
    print(f"\n{'='*70}")
    print(f"  📊 DEMO DATA SUMMARY")
    print(f"{'='*70}")
    print(f"  Events:          {counts['events']}")
    print(f"  Total matches:   {counts['matches']}")
    print(f"  Alerts:          {counts['alerts']}")
    print(f"  High/Critical:   {counts['active']}")
    print(f"  Est. exposure:   ${counts['total_amount']:,.2f}")
    print(f"{'='*70}")

    await db.close()


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    asyncio.run(seed_demo_data(reset=reset))
