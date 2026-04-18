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
