# Getting Ahead of a Surge in Incoming Requests
**Hackathon Submission** | Deadline: 30 April 2026 | Team Size: 3 Engineers

---

## Project Overview

| | |
|---|---|
| **Problem** | Insurance teams have no early warning before a claim surge following major events |
| **Goal** | Detect events, match to policyholders, and generate an alert + volume estimate within 2 hours |
| **Team Size** | 3 Engineers |
| **Deadline** | 30 April 2026 |
| **Stack** | Python · FastAPI · Next.js · Supabase · Railway · Vercel |

---

## Problem & Solution

### The Problem
When a major event occurs — a storm, flood, or large accident — insurance teams learn about it at the same time as the public. By then, claims are already piling up. There is no early warning to prepare, causing response times to blow past SLA targets and leaving customers waiting for days.

### Our Solution
An automated real-time pipeline that:
- Monitors public data sources continuously (weather APIs, news feeds)
- Detects insurance-relevant events and classifies them by type and severity
- Geo-matches the event's impact zone against existing policyholder data
- Generates an early alert with a volume estimate within 2 hours of detection
- Notifies the ops team via Slack and a live dashboard so they can prepare before the surge hits

---

## System Architecture

The pipeline has six layers, each owned by one team member and connected via clean data contracts:

| Layer | Tool | Responsibility | Hosted On |
|---|---|---|---|
| Data Ingestion | Python scripts | Poll OpenWeatherMap & NewsAPI every 5 min | Railway Cron |
| Event Storage | Supabase (PostgreSQL) | Store raw events & deduplicate | Supabase |
| Geo-Matching | Python + PostGIS | Match event region to mock policyholders | Railway / Supabase |
| Backend API | FastAPI (Python) | Expose alert endpoints | Railway |
| Alert Engine | Supabase triggers + Slack Webhook | Fire alerts when event threshold met | Supabase + Slack |
| Dashboard | Next.js (React) | Live ops view of events & alerts | Vercel |

### Data Flow
1. External APIs → Python ingestion script (Railway cron, every 5 min)
2. Ingestion script → FastAPI backend for classification and geo-matching
3. FastAPI → Supabase (events, matched policies, alerts stored)
4. Supabase real-time trigger → Slack alert fires
5. Next.js dashboard subscribes to Supabase and updates live

---

## Tech Stack

| Tool | Purpose | Why We Chose It |
|---|---|---|
| Python | Ingestion, classification, geo-matching | Team strength, best ecosystem for data + APIs |
| FastAPI | Backend API layer | Lightweight, fast to build and deploy |
| Supabase | Database + real-time subscriptions | PostgreSQL + PostGIS + free tier + real-time built-in |
| Railway | Backend + cron job hosting | Simple deploy, no DevOps overhead |
| Next.js | Frontend dashboard | Team knows JS, Vercel deploy in minutes |
| Vercel | Frontend hosting | Zero config, instant deploys |
| OpenWeatherMap | Weather event data | Free tier, reliable, easy REST API |
| NewsAPI | News event detection | Free tier, broad coverage |
| Slack Webhook | Team notifications | Instant alerts without building a notification system |

---

## Team Responsibilities

### Person 1 — Data Ingestion & Backend
- Python ingestion scripts (OpenWeatherMap, NewsAPI)
- Event classification logic
- FastAPI backend — event and alert endpoints
- Railway deployment and cron job setup

### Person 2 — Geo-Matching & Data Layer
- Supabase schema design (events, policies, alerts tables)
- Mock policy database with realistic lat/long data
- Geo-matching logic: event region → affected policyholders
- Volume estimation lookup by event type & severity

### Person 3 — Frontend & Alerting
- Next.js dashboard on Vercel
- Real-time event and alert feed using Supabase subscriptions
- Slack webhook integration for notifications
- Demo script preparation and presentation polish

---

## Project Timeline

| Phase | Dates | Focus | Key Tasks |
|---|---|---|---|
| Phase 1 | Days 1–2 (14–15 Apr) | Project Setup | Shared GitHub repo, Supabase schema, hello-world FastAPI on Railway, API keys, seed mock policy DB |
| Phase 2 | Days 3–6 (16–19 Apr) | Core Build (Parallel) | Ingestion scripts, event classification, geo-matching, volume estimation, dashboard scaffolding, Slack integration |
| Phase 3 | Days 7–10 (20–23 Apr) | Integration | End-to-end connect, replay historical event, validate 2-hour window, fix bugs |
| Phase 4 | Days 11–13 (24–26 Apr) | Polish & Demo Prep | Stress test, dashboard UI cleanup, demo script rehearsal, submission summary |
| Phase 5 | Day 14 (30 Apr) | Submission | Final check, live demo, submit before deadline |

### Phase 2 Detail (Parallel Workstreams)
- **P1:** Python ingestion scripts polling live APIs
- **P1:** Event classification logic (rule-based + LLM fallback)
- **P2:** Geo-matching logic against Supabase policy records
- **P2:** Volume estimation lookup table by event type
- **P3:** Next.js dashboard scaffolding and Supabase real-time hooks
- **P3:** Slack webhook alert integration

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Integration day failures | Define data contracts between components on Day 1. Test with mocked inputs before connecting live. |
| Geo-matching complexity | Use region/state-level matching as a fallback if radius-based logic proves too slow to build. |
| Volume estimation accuracy | Use a simple lookup table for the hackathon (e.g. "Category 4 hurricane → ~500 claims"). No ML needed. |
| Demo environment instability | Rehearse with a replayed historical event, not a live feed, to ensure the demo is predictable. |

---

## Demo Plan

The live demo will walk judges through the following sequence:

1. **Event Detection** — A real (or replayed) weather event is detected from OpenWeatherMap. The ingestion script identifies it, classifies it as insurance-relevant, and stores it in Supabase.

2. **Geo-Matching** — FastAPI queries Supabase for policies in the impacted region and returns an affected policyholder count.

3. **Alert Fires** — A Slack notification is sent to the ops team with: event type, region, estimated claim volume, and recommended action.

4. **Dashboard Updates** — The Next.js dashboard shows the live event feed, matched policyholders, and alert history with timestamps.

5. **2-Hour Window Proven** — All steps are logged with timestamps demonstrating the detection-to-alert time is well within the required 2 hours.

---

## Immediate Next Steps (This Week)

- [ ] Set up shared GitHub repo with folder structure for each component
- [ ] Create Supabase project — define `events`, `policies`, and `alerts` tables
- [ ] Get API keys: OpenWeatherMap (free) and NewsAPI (free)
- [ ] Deploy a hello-world FastAPI on Railway to confirm the pipeline works
- [ ] Seed mock policy database with ~500 fake policyholders across different regions
- [ ] Agree on the data contract (JSON schema) between Person 1 and Person 2

---

> **Note:** This is an initial plan. Details may evolve as the team progresses through the build phases.
