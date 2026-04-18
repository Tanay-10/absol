# Data Schema Design — Insurance Early-Warning System

**Date:** 2026-04-18
**Status:** Approved
**Scope:** Full system data model across all three team workstreams

## Problem

The extraction layer produces normalized disaster events, but there is no schema defining how those events connect to insurance policies, how impact zones are computed, or how claim estimates are generated. Without this, the three team members (extraction, ingestion/geo-matching, UI) have no shared data contract to build against.

## Design Decisions

- **Approach:** Properly normalized relational schema (PostgreSQL / Supabase)
- **Insurance scope:** All policy types (property, auto, life, health, commercial, liability) modeled generically via a `policy_type` field and `covered_perils` array
- **Estimation method:** Rule-based scoring — `event severity × policy type relevance × distance decay`
- **Geo-matching:** Hybrid — uses whichever geometry the event provides (point→radius, bbox→box, admin_area→boundary)
- **Policy data:** Mock — ~500 synthetic policyholders seeded for demo

## Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐
│  policyholders│────▶│   policies    │────▶│ insured_locations  │
└──────────────┘ 1:N └──────┬───────┘ 1:N └────────┬──────────┘
                            │                       │
                            │              geo-match │
                            │                       │
┌──────────┐  1:1  ┌───────┴───────┐       ┌──────┴──────────┐
│  events   │─────▶│ impact_zones   │──────▶│ exposure_matches │
└──────┬───┘       └───────────────┘       └──────┬──────────┘
       │                                          │ 1:1
       │                                   ┌──────┴──────────┐
       │                                   │ claim_estimates  │
       │                                   └──────┬──────────┘
       │                                          │ aggregate
       │           ┌───────────────┐       ┌──────┴──────────┐
       └──────────▶│    alerts      │◀──────│   (computed)    │
                   └───────────────┘       └─────────────────┘

Reference:
┌──────────────────────┐
│ event_policy_relevance│  (event_type × policy_type → claim rules)
└──────────────────────┘
```

## Table Definitions

### Event Domain

#### `events`

Persisted form of `CanonicalEvent` from the extraction layer. Upserted via `canonical_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| canonical_id | text | UNIQUE, NOT NULL | `<source>:<source_event_id>` — upsert key |
| source | text | NOT NULL | usgs, gdacs, eonet, reliefweb |
| event_family | text | NOT NULL | natural, human_caused |
| event_type | text | NOT NULL | earthquake, flood, wildfire, cyclone, conflict, etc. |
| event_subtype | text | | e.g. "mww" for earthquake mechanism |
| title | text | NOT NULL | |
| summary | text | | |
| severity_label | text | NOT NULL | minor, moderate, major, severe, critical |
| severity_score | int | NOT NULL, CHECK (0–100) | Normalized 0–100 |
| status | text | NOT NULL, default 'unknown' | active, ended, unknown |
| occurred_at | timestamptz | | When the event physically happened |
| detected_at | timestamptz | NOT NULL | When our pipeline first saw it |
| geometry_type | text | NOT NULL | point, bbox, admin_area |
| latitude | float | CHECK (-90 to 90) | For point geometry |
| longitude | float | CHECK (-180 to 180) | For point geometry |
| bbox | float[4] | | [min_lat, min_lon, max_lat, max_lon] |
| region_name | text | | Human-readable region |
| country_codes | text[] | default '{}' | ISO 3166-1 alpha-2 codes |
| severity_inputs | jsonb | default '{}' | Raw severity signals for re-scoring |
| source_url | text | | Link to original source |
| schema_version | text | NOT NULL, default 'v1' | |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

**Indexes:** `canonical_id` (unique), `event_type`, `(occurred_at DESC)`, `(latitude, longitude)` for spatial queries.

#### `impact_zones`

Computed when an event is ingested. One zone per event. Defines the geographic area to match against insured locations.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → events, UNIQUE | One zone per event |
| zone_type | text | NOT NULL | radius, bbox, admin_area |
| center_lat | float | | For radius zones |
| center_lon | float | | For radius zones |
| radius_km | float | | Estimated from event_type + severity |
| bbox | float[4] | | For bbox zones |
| admin_region | text | | For admin_area zones |
| country_code | text | | |
| computed_at | timestamptz | default now() | |

**Radius estimation rule (for point-geometry events):**

| Event Type | Severity Score | Estimated Radius (km) |
|------------|---------------|----------------------|
| earthquake | 0–44 | 50 |
| earthquake | 45–64 | 100 |
| earthquake | 65–84 | 200 |
| earthquake | 85–100 | 400 |
| flood | any | 75 |
| wildfire | 0–64 | 30 |
| wildfire | 65–100 | 80 |
| cyclone/storm | any | 300 |
| conflict | any | 50 |

These are intentionally rough — hackathon-grade estimates.

### Insurance Domain

#### `policyholders`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| name | text | NOT NULL | Individual or organization name |
| type | text | NOT NULL | individual, business |
| email | text | | For mock notifications |
| phone | text | | |
| created_at | timestamptz | default now() | |

#### `policies`

One policyholder can have multiple policies (home + auto + life).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| policyholder_id | uuid | FK → policyholders, NOT NULL | |
| policy_number | text | UNIQUE, NOT NULL | Human-readable ID like "POL-2024-00142" |
| policy_type | text | NOT NULL | property, auto, life, health, commercial, liability |
| status | text | NOT NULL, default 'active' | active, expired, cancelled |
| coverage_amount | decimal | NOT NULL | Total coverage in USD |
| deductible | decimal | NOT NULL, default 0 | Amount before claim pays out |
| premium_annual | decimal | NOT NULL | |
| effective_date | date | NOT NULL | |
| expiry_date | date | NOT NULL | |
| covered_perils | text[] | NOT NULL, default '{}' | Which event types it covers |

**`covered_perils` examples:**
- Property policy: `['earthquake', 'flood', 'wildfire', 'storm', 'cyclone', 'tornado']`
- Auto policy: `['flood', 'storm', 'cyclone', 'tornado']`
- Life policy: `['earthquake', 'flood', 'cyclone', 'conflict', 'terrorism']`
- Commercial policy: `['earthquake', 'flood', 'wildfire', 'storm', 'conflict', 'industrial']`

#### `insured_locations`

The geo-locatable asset tied to a policy. This is what gets matched against impact zones.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| policy_id | uuid | FK → policies, NOT NULL | |
| label | text | NOT NULL | "Primary residence", "Warehouse #2" |
| latitude | float | NOT NULL, CHECK (-90 to 90) | |
| longitude | float | NOT NULL, CHECK (-180 to 180) | |
| address | text | | Human-readable |
| city | text | | |
| state_province | text | | |
| country_code | text | NOT NULL | ISO 3166-1 alpha-2 |
| property_value | decimal | | For property/commercial policies |

**Indexes:** `(latitude, longitude)` for spatial queries, `country_code` for admin matching.

### Linking Domain

#### `exposure_matches`

Junction table linking events to affected policies. Created by the geo-matching engine.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → events, NOT NULL | |
| policy_id | uuid | FK → policies, NOT NULL | |
| location_id | uuid | FK → insured_locations, NOT NULL | |
| distance_km | float | | Distance from event center to insured location |
| match_method | text | NOT NULL | radius, bbox_overlap, admin_match |
| matched_at | timestamptz | default now() | |

**UNIQUE constraint:** `(event_id, policy_id, location_id)`

#### `claim_estimates`

Per-match prediction using rule-based scoring.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| exposure_match_id | uuid | FK → exposure_matches, UNIQUE | One estimate per match |
| claim_probability | float | NOT NULL, CHECK (0–1) | |
| estimated_amount | decimal | NOT NULL | |
| risk_factors | jsonb | NOT NULL | Explainability payload |
| computed_at | timestamptz | default now() | |

**`risk_factors` example:**
```json
{
  "base_claim_rate": 0.35,
  "severity_factor": 1.05,
  "distance_decay": 0.85,
  "final_probability": 0.31,
  "reasoning": "Property policy within 45km of M5.9 earthquake"
}
```

**Claim estimation formula:**
```
claim_probability = base_claim_rate
                    × (severity_score / 100 × severity_multiplier)
                    × distance_decay(distance_km)

estimated_amount  = coverage_amount × claim_probability

distance_decay(d) = max(0.1, 1.0 - (d / radius_km))
```

#### `alerts`

Aggregated per-event assessment.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → events, NOT NULL | |
| alert_level | text | NOT NULL | low, medium, high, critical |
| total_policies_affected | int | NOT NULL | |
| estimated_claim_count | int | NOT NULL | Matches with claim_probability > 0.1 |
| estimated_total_amount | decimal | NOT NULL | |
| recommended_action | text | NOT NULL | |
| generated_at | timestamptz | default now() | |
| sent_via | text[] | default '{}' | ['slack', 'dashboard'] |
| sent_at | timestamptz | | |

**Alert level rules:**
| Estimated Claims | Level | Recommended Action |
|-----------------|-------|--------------------|
| 0–10 | low | Monitor |
| 11–50 | medium | Notify team lead |
| 51–200 | high | Activate surge team |
| 200+ | critical | Full emergency response |

### Reference Data

#### `event_policy_relevance`

Drives the rule-based scoring. Seeded once during setup.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| event_type | text | PK part 1 | |
| policy_type | text | PK part 2 | |
| is_relevant | bool | NOT NULL | |
| base_claim_rate | float | NOT NULL | Base probability before adjustments |
| severity_multiplier | float | NOT NULL, default 1.0 | How much severity amplifies the rate |

**Seed data (subset):**

| event_type | policy_type | relevant | base_rate | severity_mult |
|------------|------------|----------|-----------|---------------|
| earthquake | property | ✓ | 0.35 | 1.5 |
| earthquake | auto | ✓ | 0.10 | 1.2 |
| earthquake | life | ✓ | 0.02 | 2.0 |
| earthquake | commercial | ✓ | 0.30 | 1.5 |
| flood | property | ✓ | 0.40 | 1.3 |
| flood | auto | ✓ | 0.25 | 1.3 |
| flood | life | ✗ | — | — |
| wildfire | property | ✓ | 0.50 | 1.4 |
| wildfire | life | ✗ | — | — |
| cyclone | property | ✓ | 0.45 | 1.6 |
| cyclone | auto | ✓ | 0.20 | 1.3 |
| conflict | property | ✓ | 0.40 | 1.8 |
| conflict | life | ✓ | 0.05 | 2.5 |
| terrorism | commercial | ✓ | 0.30 | 2.0 |

## Data Flow Summary

1. **Extraction layer** (your part) produces `CanonicalEvent` batch → POSTed to ingestion API
2. **Ingestion** upserts into `events` table via `canonical_id`
3. **Impact zone computation** creates one `impact_zones` row per event using hybrid geometry rules
4. **Geo-matching engine** queries `insured_locations` within the impact zone → creates `exposure_matches`
5. **Claim estimator** scores each match using `event_policy_relevance` rules → creates `claim_estimates`
6. **Alert generator** aggregates estimates per event → creates `alerts` row → fires Slack webhook
7. **Dashboard** reads events, matches, estimates, alerts via Supabase real-time subscriptions

## Mock Data Strategy

Seed ~500 policyholders distributed across disaster-prone regions:
- **California coast** (earthquake + wildfire zone): ~100 policyholders
- **Florida** (hurricane/cyclone zone): ~100
- **Japan** (earthquake + tsunami zone): ~80
- **Southeast Asia** (flood + cyclone zone): ~80
- **Europe** (mixed, lower risk): ~70
- **Middle East** (conflict zone): ~40
- **Other** (scattered globally): ~30

Each policyholder gets 1–3 policies of different types with realistic coverage amounts. Each policy gets 1–2 insured locations near the policyholder's region.
