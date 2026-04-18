# Extraction → Database Bridge Design

> Connects the extraction pipeline output to the Supabase database via PostgREST API.

## Problem

The extraction pipeline produces `CanonicalEvent` objects and the database has an `events` table, but nothing connects them. Without this bridge, the team has no real disaster data in the database to build against.

## Approach

Add a new exporter (`SupabaseClient`) that follows the existing exporter pattern. It maps `CanonicalEvent` fields to `events` table columns and upserts via Supabase PostgREST API. It also auto-computes `impact_zones` from event geometry and severity.

## Field Mapping

| CanonicalEvent field | events column | Notes |
|---------------------|---------------|-------|
| canonical_id | canonical_id | UNIQUE, used for upsert |
| source | source | |
| event_family.value | event_family | Enum → string |
| event_type.value | event_type | |
| event_subtype | event_subtype | |
| title | title | |
| summary | summary | |
| severity_label.value | severity_label | |
| severity_score | severity_score | |
| status.value | status | |
| occurred_at | occurred_at | ISO string |
| detected_at | detected_at | |
| geometry_type.value | geometry_type | |
| latitude | latitude | |
| longitude | longitude | |
| bbox | bbox | |
| region_name | region_name | |
| country_codes | country_codes | |
| severity_inputs | severity_inputs | JSON |
| source_url | source_url | |
| schema_version | schema_version | |

## Impact Zone Computation

| Geometry type | Zone type | Logic |
|--------------|-----------|-------|
| POINT | radius | center = (lat, lon), radius_km = f(severity_score, event_type) |
| BBOX | bbox | bbox = event.bbox |
| ADMIN_AREA | admin_area | admin_region = region_name, country_code = country_codes[0] |

**Radius formula:** `base_radius * (1 + severity_score / 50)`
- Earthquake: 50km base
- Flood/Cyclone/Storm: 100km base
- Wildfire: 30km base
- Default: 50km base

## Configuration

New env vars in `.env.example`:
- `SUPABASE_URL` — Project URL (e.g., `https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY` — Anonymous/service key for PostgREST auth

## Integration

- New CLI flag: `--db` activates the Supabase exporter
- Fits into existing pipeline exporter list alongside JSONLWriter and BackendClient
- Upserts use `Prefer: resolution=merge-duplicates` header on canonical_id

## Files

- `src/extraction_normalization/export/supabase_client.py` — SupabaseClient exporter
- `tests/export/test_supabase_client.py` — Tests with respx mocking
- Update: `config.py` — Add SUPABASE_URL, SUPABASE_ANON_KEY
- Update: `main.py` — Add --db flag
- Update: `.env.example` — Add Supabase vars
