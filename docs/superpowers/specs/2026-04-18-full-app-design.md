# Full Application Design — Insurance Early-Warning System

**Date:** 2026-04-18
**Status:** Approved (autonomous decision — user requested "ship it")
**Scope:** Backend API + Frontend Dashboard — everything needed to make the full system work end-to-end

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Extraction pipeline | ✅ Done | `services/extraction_normalization/` |
| Database schema (9 tables) | ✅ Done | `services/database/migrations/001_create_schema.sql` |
| Reference seeds (78 rows) | ✅ Done | `services/database/seeds/002_reference_data.sql` |
| Mock data (~500 policyholders) | ✅ Done | `services/database/seeds/003_mock_data.sql` |
| Supabase bridge (event upsert) | ✅ Done | `export/supabase_client.py` |

## What This Spec Covers

Two new services:

1. **Backend API** (`services/backend/`) — FastAPI server: geo-matching, claim estimation, alert generation, REST endpoints
2. **Frontend Dashboard** (`services/frontend/`) — Next.js app: dark-themed ops dashboard with map, alerts, stats

## Sub-Project A: Backend API

### Tech Stack

- **Framework:** FastAPI (Python 3.11+)
- **Database client:** httpx → Supabase PostgREST (consistent with existing pattern)
- **Geo math:** Haversine distance in Python (fine for ~500 policyholders)
- **Server:** uvicorn

### Architecture

```
services/backend/
├── pyproject.toml
├── src/backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py             # Env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
│   ├── supabase.py           # Thin PostgREST client wrapper
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── events.py         # GET /api/events, GET /api/events/{id}
│   │   ├── alerts.py         # GET /api/alerts
│   │   ├── dashboard.py      # GET /api/dashboard/summary
│   │   └── pipeline.py       # POST /api/pipeline/run
│   ├── services/
│   │   ├── __init__.py
│   │   ├── geo_matcher.py    # Find insured locations within impact zone
│   │   ├── claim_estimator.py # Apply claim estimation formula
│   │   └── alert_generator.py # Aggregate matches → alert
│   └── utils/
│       ├── __init__.py
│       └── geo.py            # Haversine distance function
└── tests/
    └── ...
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/events` | List events (filterable by type, severity, status) |
| GET | `/api/events/{id}` | Single event with impact zone, matches, claims, alert |
| GET | `/api/alerts` | List alerts (filterable by level) |
| GET | `/api/dashboard/summary` | Aggregate stats for dashboard cards |
| POST | `/api/pipeline/run` | Trigger extraction pipeline, geo-matching, and alert generation |

### Geo-Matching Engine

For each event with an impact zone:
1. Query all `insured_locations` from Supabase
2. For **radius** zones: compute haversine distance from (center_lat, center_lon) to each location; keep those within `radius_km`
3. For **bbox** zones: check if location lat/lon falls within the bounding box
4. For **admin_area** zones: match on `country_code`
5. Filter to policies where `covered_perils` includes the event's `event_type`
6. Write matches to `exposure_matches` table

### Claim Estimation

For each exposure match, using the formula from the data schema spec:
```
claim_probability = base_claim_rate × (severity_score/100 × severity_multiplier) × distance_decay
estimated_amount = coverage_amount × claim_probability
distance_decay = max(0.1, 1.0 - (distance_km / radius_km))
```

Lookup `base_claim_rate` and `severity_multiplier` from `event_policy_relevance` table.

### Alert Generation

After all matches and estimates are computed for an event:
1. Count total policies affected
2. Count estimated claims (matches with `claim_probability > 0.1`)
3. Sum estimated amounts
4. Determine alert level: 0–10 → low, 11–50 → medium, 51–200 → high, 200+ → critical
5. Set recommended action based on level
6. Upsert into `alerts` table

### Pipeline Run Endpoint

`POST /api/pipeline/run` orchestrates the full flow:
1. Shell out to extraction pipeline: `python -m extraction_normalization.main --db --no-artifacts`
2. Query newly upserted events from Supabase
3. Run geo-matching for each event
4. Run claim estimation for each match
5. Generate alerts
6. Return summary

## Sub-Project B: Frontend Dashboard

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (dark theme)
- **UI Components:** shadcn/ui
- **Map:** Leaflet + react-leaflet (free, no API key)
- **Data:** @supabase/supabase-js for fetching + real-time subscriptions
- **Charts:** recharts (simple bar/line for stats)

### Page Layout

Single-page dashboard with 4 zones:

```
┌─────────────────────────────────────────────────────┐
│  HEADER: "InsureShield" logo + "Run Pipeline" button │
├────────────────────────┬────────────────────────────┤
│                        │  STATS CARDS               │
│                        │  ┌────┐ ┌────┐ ┌────┐ ┌──┐│
│     WORLD MAP          │  │Evts│ │Alrt│ │Plcy│ │$$ ││
│     (Leaflet)          │  └────┘ └────┘ └────┘ └──┘│
│     - Event markers    ├────────────────────────────┤
│     - Color by severity│  ALERTS FEED               │
│     - Click for detail │  - Real-time list          │
│                        │  - Color-coded by level    │
│                        │  - Click → event detail    │
├────────────────────────┴────────────────────────────┤
│  EVENT DETAIL PANEL (slide-up or modal)              │
│  - Event info + impact zone on map                   │
│  - Affected policies table                           │
│  - Claim estimates breakdown                         │
└─────────────────────────────────────────────────────┘
```

### Color Scheme (Dark Theme)

- Background: `#0f172a` (slate-900)
- Cards: `#1e293b` (slate-800)
- Borders: `#334155` (slate-700)
- Text: `#f8fafc` (slate-50)
- Accent: `#3b82f6` (blue-500)
- Alert colors: low=`#22c55e` (green), medium=`#eab308` (yellow), high=`#f97316` (orange), critical=`#ef4444` (red)
- Severity markers on map: minor=blue, moderate=yellow, major=orange, severe=red, critical=purple

### Real-Time Updates

- Subscribe to Supabase `alerts` table for INSERT events
- When new alert arrives, prepend to alerts feed with animation
- Auto-refresh dashboard stats every 30 seconds

### Event Detail View

When user clicks an event marker or alert:
- Show event metadata (type, severity, source, time)
- Highlight impact zone on map (circle for radius, rectangle for bbox)
- Table of affected policies with: policy number, type, holder name, distance, claim probability, estimated amount
- Total exposure summary

## Data Flow (End-to-End)

```
User clicks "Run Pipeline"
        │
        ▼
POST /api/pipeline/run
        │
        ├─► Extraction pipeline runs (fetches USGS, GDACS, EONET, ReliefWeb)
        │   └─► Events upserted to Supabase via PostgREST
        │
        ├─► Backend queries new events
        │   └─► For each event:
        │       ├─► Geo-matching: find affected insured_locations
        │       ├─► Claim estimation: compute probabilities and amounts
        │       └─► Alert generation: aggregate and classify
        │
        └─► Return summary to frontend
                │
                ▼
        Dashboard updates:
        - New markers on map
        - Stats cards refresh
        - Alerts feed updates (real-time via Supabase subscription)
```

## Deployment (Hackathon)

- **Backend:** Run locally with `uvicorn` (or deploy to Railway if time permits)
- **Frontend:** Run locally with `next dev` (or deploy to Vercel)
- **Database:** Supabase cloud (already decided)
- No Docker needed — keep it simple

## What We're NOT Building

- Authentication/authorization (no login — it's a demo)
- Email/SMS notifications (Slack webhook is stretch goal, not MVP)
- Historical analytics or reporting
- Mobile responsiveness (desktop-first for demo)
- CI/CD pipelines
