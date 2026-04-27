"""Canonical event schema — the stable contract shared with the ingestion layer."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Optional, List

from pydantic import BaseModel, Field, model_validator, ConfigDict


# ── Enums ────────────────────────────────────────────────────────────────────


class EventFamily(str, Enum):
    NATURAL = "natural"
    HUMAN_CAUSED = "human_caused"


class EventType(str, Enum):
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    WILDFIRE = "wildfire"
    TSUNAMI = "tsunami"
    TORNADO = "tornado"
    STORM = "storm"
    VOLCANO = "volcano"
    CYCLONE = "cyclone"
    DROUGHT = "drought"
    CONFLICT = "conflict"
    TERRORISM = "terrorism"
    INDUSTRIAL = "industrial"
    OTHER = "other"


class SeverityLabel(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    SEVERE = "severe"
    CRITICAL = "critical"


class GeometryType(str, Enum):
    POINT = "point"
    BBOX = "bbox"
    POLYGON = "polygon"
    ADMIN_AREA = "admin_area"


class EventStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    UNKNOWN = "unknown"


# ── Severity Inputs (source-specific raw signals) ───────────────────────────


class SeverityInputs(BaseModel):
    magnitude: Optional[float] = None
    alert_level: Optional[str] = None
    casualties_reported: Optional[int] = None
    affected_population: Optional[int] = None
    wind_speed_kph: Optional[float] = None


# ── Trajectory Models ───────────────────────────────────────────────────────


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


# ── Canonical Event ─────────────────────────────────────────────────────────


class CanonicalEvent(BaseModel):
    """Single normalized event record passed to the ingestion layer."""

    # Identity
    canonical_id: str = Field(
        ..., description="Deterministic ID: <source>:<source_event_id>"
    )
    source: str
    source_event_id: str

    # Classification
    event_family: EventFamily
    event_type: EventType
    event_subtype: Optional[str] = None

    # Description
    title: str
    summary: Optional[str] = None

    # Severity
    severity_label: SeverityLabel = SeverityLabel.MODERATE
    severity_score: int = Field(
        default=50, ge=0, le=100, description="Normalized 0-100"
    )

    # Status
    status: EventStatus = EventStatus.UNKNOWN
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    # Timing
    occurred_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    detected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Location
    geometry_type: GeometryType = GeometryType.POINT
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    bbox: Optional[list[float]] = Field(
        default=None, description="[min_lat, min_lon, max_lat, max_lon]"
    )
    region_name: Optional[str] = None
    country_codes: list[str] = Field(default_factory=list)

    # Trajectory (only for mobile/expanding event types)
    is_mobile: bool = False
    trajectory: Optional[TrajectoryData] = None
    trajectory_bounds: Optional[dict] = Field(
        default=None, description="{min_lat, min_lon, max_lat, max_lon}"
    )

    # Source-specific severity signals
    severity_inputs: SeverityInputs = Field(default_factory=SeverityInputs)

    # Provenance
    source_url: Optional[str] = None
    raw_payload_ref: Optional[str] = None

    # Meta
    normalized_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    schema_version: str = "v1"

    @model_validator(mode="after")
    def _validate_canonical_id(self) -> "CanonicalEvent":
        expected = f"{self.source}:{self.source_event_id}"
        if self.canonical_id != expected:
            raise ValueError(
                f"canonical_id must be '<source>:<source_event_id>', "
                f"got '{self.canonical_id}' (expected '{expected}')"
            )
        return self

    @model_validator(mode="after")
    def _validate_geometry(self) -> "CanonicalEvent":
        if self.geometry_type == GeometryType.POINT:
            if self.latitude is None or self.longitude is None:
                raise ValueError("POINT geometry requires latitude and longitude")
        elif self.geometry_type == GeometryType.BBOX:
            if not self.bbox or len(self.bbox) != 4:
                raise ValueError("BBOX geometry requires a 4-element bbox list")
        return self

    def to_handoff_dict(self) -> dict:
        """Serialize for the ingestion batch contract."""
        return self.model_dump(mode="json")
