# Trajectory Animation — Design Spec

**Date:** 2026-04-23  
**Project:** Insurance Early-Warning System (Hackathon)  
**Scope:** Extend the existing data schema to support map-based animation of moving disaster events

---

## 1. Problem & Goal

The existing `events` table stores a single point-in-time location for each disaster event. This is sufficient for static map pins, but the dashboard needs to animate events that move or expand over time — hurricanes tracking across the Gulf, tornadoes cutting erratic paths, tsunamis radiating outward from an epicenter.

**Goal:** Extend the schema in a backward-compatible way so the frontend can replay, animate, and interpolate a disaster's trajectory without any changes to existing consumers.

---

## 2. Decisions Made

| Question | Decision |
|---|---|
| Where does trajectory data live? | JSONB column on the `events` table |
| Which event types get trajectories? | Moving disasters (cyclone, tornado, tsunami, storm) + expanding-radius events (wildfire, flood) |
| How does the frontend fetch it? | Embedded in the existing `GET /events/{id}` response |
| What does the trajectory store? | Full path (all waypoints) + a `current_index` pointer to "now" |
| Time resolution | Mixed — each disaster type uses its own interval |
| Trajectory structure | Waypoint-list (Option A): each waypoint is `{t, lat, lon, state: {...}}` |
| Schema extension strategy | Approach B: JSONB + `is_mobile` boolean + `trajectory_bounds` bbox |

---

## 3. Schema Changes

### 3.1 DB Migration: `services/database/migrations/002_add_trajectory.sql`

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_mobile          BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS trajectory_bounds  JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trajectory         JSONB    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_events_mobile
  ON events (is_mobile) WHERE is_mobile = true;

COMMENT ON COLUMN events.is_mobile IS
  'True for event types that move or expand over time (cyclone, tornado, tsunami, storm, wildfire, flood)';
COMMENT ON COLUMN events.trajectory IS
  'Waypoint-list trajectory. Schema: {waypoints:[{t,lat,lon,state:{...}}], interval_minutes, current_index, total_waypoints}';
COMMENT ON COLUMN events.trajectory_bounds IS
  'Bounding box of full trajectory path: {min_lat, min_lon, max_lat, max_lon}';
```

### 3.2 Backward Compatibility

All three new columns are nullable with safe defaults (`false` / `NULL`). Existing rows are unaffected. The existing `GET /events` list query and all geo-matching / alert logic ignore these columns. `schema_version` is bumped to `"v2"` only on events that carry a non-null trajectory — the mock data generator sets `schema_version="v2"` explicitly when constructing such `CanonicalEvent` objects; the default remains `"v1"` for all other events.

---

## 4. Pydantic Model Extension

### File: `services/extraction_normalization/src/extraction_normalization/models/canonical_event.py`

Add three new models and one optional field to `CanonicalEvent`:

```python
class WaypointState(BaseModel):
    intensity:      Optional[float] = None   # 0–100 normalized
    speed_kph:      Optional[float] = None
    direction_deg:  Optional[float] = None   # 0–360°
    category:       Optional[int]   = None   # Saffir-Simpson / EF scale / etc.
    radius_km:      Optional[float] = None   # for expanding events (wildfire, flood, tsunami)
    # Disaster-specific extras stored here too (wave_height_m, wind_speed_kph, etc.)
    model_config = ConfigDict(extra="allow")  # accept type-specific fields

class Waypoint(BaseModel):
    t:     datetime
    lat:   float = Field(ge=-90,  le=90)
    lon:   float = Field(ge=-180, le=180)
    state: WaypointState = Field(default_factory=WaypointState)

class TrajectoryData(BaseModel):
    waypoints:        List[Waypoint]
    interval_minutes: int
    current_index:    int = 0          # index into waypoints pointing to "now"
    total_waypoints:  int              # always == len(waypoints)

    @model_validator(mode="after")
    def _validate_index(self) -> "TrajectoryData":
        if not (0 <= self.current_index < self.total_waypoints):
            raise ValueError("current_index out of range")
        if self.total_waypoints != len(self.waypoints):
            raise ValueError("total_waypoints must equal len(waypoints)")
        return self
```

Added to `CanonicalEvent`:

```python
# Trajectory (only for mobile/expanding event types)
trajectory: Optional[TrajectoryData] = None
```

The `to_handoff_dict()` method requires no changes — `model_dump(mode="json")` serialises the nested model automatically.

---

## 5. Mock Data

### File: `services/database/seeds/generate_trajectory_mock_data.py`

A standalone Python script that builds five `CanonicalEvent` objects and emits `004_trajectory_mock_data.sql`.

| Event | Type | Path | Interval | Waypoints | Key state fields |
|---|---|---|---|---|---|
| Hurricane Mara | cyclone | Smooth parabolic arc, Gulf → Florida landfall | 60 min | 48 | category, wind_speed_kph, radius_km, direction_deg |
| Tornado EF3, Oklahoma | tornado | Erratic random-walk with NE drift | 5 min | 36 | intensity, speed_kph, direction_deg, width_m |
| Indian Ocean Tsunami | tsunami | Radial expansion from epicenter (radius grows) | 15 min | 16 | wave_height_m, speed_kph, radius_km |
| California Wildfire | wildfire | Expanding radius, slow position drift | 30 min | 24 | intensity, radius_km, acres_burned |
| Mississippi Flood | flood | Downstream drift + expanding inundation zone | 60 min | 24 | intensity, radius_km, water_level_m |

**Path generation approach per type:**

- **Hurricane:** Parametric sine curve overlaid on a straight NW→NE track. Intensity ramps up then peaks at landfall.
- **Tornado:** Base heading NE, each step adds Gaussian noise to lat/lon displacement. Intensity random-walks between 60–95.
- **Tsunami:** Position stays near epicenter; `radius_km` grows linearly at ~800 km/h. `wave_height_m` decreases with distance.
- **Wildfire / Flood:** Position drifts slowly (wind/current direction); `radius_km` grows at a realistic rate. Intensity fluctuates.

`current_index` is set to ~50% through each path so the event appears "in progress" on the demo.

---

## 6. API Changes

### 6.1 `GET /events/{id}` — no code change required

The existing `SELECT * FROM events WHERE id = ?` already returns all columns. Once the migration runs, `is_mobile`, `trajectory_bounds`, and `trajectory` surface automatically in the response.

### 6.2 `GET /events` — one-line filter addition

Add an optional `is_mobile` query parameter to the existing list endpoint:

```python
is_mobile: bool | None = Query(None)
```

If provided, append `AND is_mobile = ?` to the WHERE clause. This lets the map view cheaply pre-fetch only animated events.

### 6.3 No new endpoints needed

Trajectory is embedded in the existing detail response per the decision in §2.

---

## 7. Frontend Animation Contract

The trajectory object is designed so the frontend can:

1. **Replay from start:** iterate `waypoints[0..total_waypoints-1]` in order.
2. **Start from "now":** begin at `waypoints[current_index]`.
3. **Interpolate between points:** linear interpolation on `lat`/`lon` and all numeric `state` fields between consecutive waypoints, using wall-clock delta ÷ `interval_minutes` as the interpolation factor.
4. **Show expanding radius:** if `state.radius_km` is present, draw a circle of that radius around the current position.
5. **Color/icon by intensity:** `state.intensity` (0–100) maps directly to the existing severity colour scale.

No frontend code is prescribed here — this is a data contract only.

---

## 8. Files Changed / Created

| File | Change |
|---|---|
| `services/database/migrations/002_add_trajectory.sql` | **New** — DB migration |
| `services/extraction_normalization/src/extraction_normalization/models/canonical_event.py` | **Extended** — add `WaypointState`, `Waypoint`, `TrajectoryData`, optional field on `CanonicalEvent` |
| `services/database/seeds/generate_trajectory_mock_data.py` | **New** — mock data generator script |
| `services/database/seeds/004_trajectory_mock_data.sql` | **New** — generated SQL (output of above script) |
| `services/backend/src/backend/routers/events.py` | **Minor** — add `is_mobile` filter to list endpoint |

---

## 9. Out of Scope

- Real-time trajectory updates from live APIs (mock data only for the hackathon)
- Forecast trajectory (future path prediction)
- 3D / elevation data
- Frontend rendering code (owned by Person 3)
- Streaming / websocket delivery of trajectory updates
