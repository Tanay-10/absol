# Copilot Instructions

## Project Context

Insurance early-warning system that detects global disaster events (natural and human-caused) to alert underwriters before claim surges. Hackathon project — optimize for working demos over production robustness.

The repo is a monorepo with independent services under `services/`. Currently only `extraction_normalization` exists; the ingestion and UI layers are built by other team members.

## Build & Test

All commands run from `services/extraction_normalization/`:

```bash
# Install (editable, with dev deps)
pip install -e ".[dev]"

# Run full test suite
python -m pytest tests/ -v

# Run a single test file
python -m pytest tests/sources/test_usgs.py -v

# Run a single test by name
python -m pytest tests/ -k "test_normalizes_moderate_earthquake" -v

# Run the pipeline against live APIs
python -m extraction_normalization.main --json --no-artifacts

# Run with artifact persistence
python -m extraction_normalization.main

# Push results to backend ingestion API
python -m extraction_normalization.main --push
```

No linter or type-checker is configured.

## Architecture

### Data flow

```
Live APIs → Source Adapters → CanonicalEvent (Pydantic) → Deduplicate → Export
```

1. **Source adapters** (`sources/`) each implement `BaseSource`: `fetch_raw()` calls the API, `normalize()` maps one raw dict to a `CanonicalEvent`. The base class provides `fetch_and_normalize()` which catches and skips per-record failures.
2. **Pipeline** (`pipeline.py`) runs all sources concurrently via `asyncio.gather`, flattens results, deduplicates, then passes to exporters.
3. **Deduplication** (`normalize/dedupe.py`) is two-phase: exact match on `canonical_id`, then cross-source heuristic (same event_type + close in time + close in space). Source priority determines which record wins (USGS > GDACS > EONET > ReliefWeb).
4. **Export** (`export/`) writes JSONL artifacts and/or POSTs a batch envelope to the backend ingestion API.

### Canonical event contract

`CanonicalEvent` in `models/canonical_event.py` is the stable interface between extraction and ingestion. Its schema is versioned (`schema_version: "v1"`). The `canonical_id` is always `<source>:<source_event_id>` — the model validator enforces this.

The batch payload envelope sent to the backend:
```json
{ "schema_version": "v1", "producer": "extraction_normalization", "batch_generated_at": "...", "events": [...] }
```

### Source priority

| Source | Priority | Coverage |
|--------|----------|----------|
| USGS | 1 (highest) | Earthquakes |
| GDACS | 2 | Earthquakes, cyclones, floods, volcanoes, wildfires, droughts |
| EONET | 3 | Wildfires, volcanoes, floods, storms, landslides |
| ReliefWeb | 4 | Conflicts, terrorism (requires `RELIEFWEB_APPNAME` env var) |

### Severity scoring

Each event type has its own scorer in `normalize/severity.py` that maps source-specific signals (magnitude, alert level, wind speed, casualties) to a 0–100 score. The score maps to a label: minor (0–24), moderate (25–44), major (45–64), severe (65–84), critical (85–100).

## Conventions

### Adding a new source adapter

1. Create a new file in `sources/` that subclasses `BaseSource`
2. Implement `name` property, `fetch_raw()`, and `normalize()`
3. Add its raw type strings to `normalize/event_type_map.py`
4. Add its priority to `_SOURCE_PRIORITY` in `normalize/dedupe.py`
5. Register it in `get_default_sources()` in `main.py`
6. Add a test file under `tests/sources/` using `respx` to mock HTTP calls

### Testing patterns

- HTTP mocking uses `respx` (not `unittest.mock` for HTTP) with `@pytest.mark.asyncio` and `asyncio_mode = "strict"` in pyproject.toml
- Source tests have two groups: normalize tests (sync, feed raw dicts directly) and fetch tests (async, mock HTTP with `respx`)
- `src/` layout with `pythonpath = ["src"]` in pytest config — imports use the package name directly: `from extraction_normalization.models.canonical_event import CanonicalEvent`

### Configuration

All tunables are env vars loaded in `config.py` with sensible defaults. No API keys are required for Tier 1 sources (USGS, GDACS, EONET). ReliefWeb requires `RELIEFWEB_APPNAME` and gracefully returns empty results without it.

### Datetime handling

Always use `datetime.now(UTC)` from `datetime` — never `datetime.utcnow()` (deprecated in Python 3.12+). All timestamps should be timezone-aware UTC.

### GeoJSON coordinate order

External APIs use GeoJSON order `[longitude, latitude]`. The canonical model uses `latitude`/`longitude` as separate fields. Always swap when converting.
