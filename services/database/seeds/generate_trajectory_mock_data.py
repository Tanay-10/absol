"""Mock data generator for mobile events with trajectory paths."""
from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, UTC
from typing import List

# Import models from extraction service
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventType,
    EventFamily,
    SeverityLabel,
    EventStatus,
    TrajectoryData,
    Waypoint,
    WaypointState,
)

def generate_hurricane_mara() -> CanonicalEvent:
    """Hurricane tracking across the Gulf toward Florida."""
    start_time = datetime.now(UTC) - timedelta(days=2)
    waypoints: List[Waypoint] = []
    
    # Starting in the Gulf
    start_lat, start_lon = 22.0, -90.0
    
    for i in range(48):
        t = start_time + timedelta(hours=i)
        # Smooth parabolic arc
        # Lat moves 22 -> 30
        # Lon moves -90 -> -80
        progress = i / 47
        lat = start_lat + 8 * progress + 2 * math.sin(progress * math.pi)
        lon = start_lon + 10 * progress
        
        intensity = 40 + 50 * math.sin(progress * math.pi)
        category = 1
        if intensity > 85: category = 3
        elif intensity > 70: category = 2
        
        waypoints.append(Waypoint(
            t=t,
            lat=lat,
            lon=lon,
            state=WaypointState(
                intensity=intensity,
                category=category,
                wind_speed_kph=120 + intensity,
                radius_km=150 + 50 * progress,
                direction_deg=45 + 10 * math.sin(progress * math.pi)
            )
        ))
    
    return CanonicalEvent(
        canonical_id="mock:hurricane_mara",
        source="mock",
        source_event_id="hurricane_mara",
        event_family=EventFamily.NATURAL,
        event_type=EventType.CYCLONE,
        title="Hurricane Mara",
        summary="Major hurricane tracking North-East through the Gulf of Mexico.",
        severity_label=SeverityLabel.CRITICAL,
        severity_score=92,
        status=EventStatus.ACTIVE,
        occurred_at=start_time,
        geometry_type="point",
        latitude=waypoints[24].lat,
        longitude=waypoints[24].lon,
        is_mobile=True,
        trajectory=TrajectoryData(
            waypoints=waypoints,
            interval_minutes=60,
            current_index=24,
            total_waypoints=len(waypoints)
        ),
        trajectory_bounds={
            "min_lat": 22.0, "min_lon": -90.0,
            "max_lat": 32.0, "max_lon": -80.0
        },
        schema_version="v2"
    )

def generate_tornado_oklahoma() -> CanonicalEvent:
    """Tornado with erratic random-walk."""
    start_time = datetime.now(UTC) - timedelta(hours=3)
    waypoints: List[Waypoint] = []
    
    lat, lon = 35.4, -97.5 # near OKC
    
    for i in range(36):
        t = start_time + timedelta(minutes=i*5)
        # Random walk with NE drift
        lat += 0.01 + 0.005 * math.sin(i * 0.5)
        lon += 0.01 + 0.005 * math.cos(i * 0.5)
        
        intensity = 70 + 20 * math.sin(i * 0.2)
        
        waypoints.append(Waypoint(
            t=t,
            lat=lat,
            lon=lon,
            state=WaypointState(
                intensity=intensity,
                category=3,
                speed_kph=60,
                direction_deg=45,
                width_m=400
            )
        ))
        
    return CanonicalEvent(
        canonical_id="mock:tornado_okc",
        source="mock",
        source_event_id="tornado_okc",
        event_family=EventFamily.NATURAL,
        event_type=EventType.TORNADO,
        title="Tornado EF3, Oklahoma",
        summary="High-intensity tornado track near Oklahoma City metropolitan area.",
        severity_label=SeverityLabel.SEVERE,
        severity_score=85,
        status=EventStatus.ACTIVE,
        occurred_at=start_time,
        latitude=waypoints[18].lat,
        longitude=waypoints[18].lon,
        is_mobile=True,
        trajectory=TrajectoryData(
            waypoints=waypoints,
            interval_minutes=5,
            current_index=18,
            total_waypoints=len(waypoints)
        ),
        schema_version="v2"
    )

def generate_tsunami_indian_ocean() -> CanonicalEvent:
    """Tsunami radiating from epicenter."""
    start_time = datetime.now(UTC) - timedelta(hours=4)
    waypoints: List[Waypoint] = []
    
    epicenter_lat, epicenter_lon = 3.3, 95.8
    
    for i in range(16):
        t = start_time + timedelta(minutes=i*15)
        # Epicenter stays static
        # Radius grows linearly
        radius = i * 200 # 200km growth per 15min (~800km/h)
        wave_height = max(0.5, 10.0 - i * 0.5)
        
        waypoints.append(Waypoint(
            t=t,
            lat=epicenter_lat,
            lon=epicenter_lon,
            state=WaypointState(
                intensity=90 - i * 2,
                radius_km=radius,
                wave_height_m=wave_height,
                speed_kph=800
            )
        ))
        
    return CanonicalEvent(
        canonical_id="mock:tsunami_io",
        source="mock",
        source_event_id="tsunami_io",
        event_family=EventFamily.NATURAL,
        event_type=EventType.TSUNAMI,
        title="Indian Ocean Tsunami",
        summary="Major seismic event resulting in wide-area tsunami propagation.",
        severity_label=SeverityLabel.CRITICAL,
        severity_score=95,
        status=EventStatus.ACTIVE,
        occurred_at=start_time,
        latitude=epicenter_lat,
        longitude=epicenter_lon,
        is_mobile=True,
        trajectory=TrajectoryData(
            waypoints=waypoints,
            interval_minutes=15,
            current_index=8,
            total_waypoints=len(waypoints)
        ),
        schema_version="v2"
    )

def generate_wildfire_cali() -> CanonicalEvent:
    """Expanding wildfire in California."""
    start_time = datetime.now(UTC) - timedelta(days=1)
    waypoints: List[Waypoint] = []
    
    lat, lon = 38.5, -122.5 # Sonoma area
    
    for i in range(24):
        t = start_time + timedelta(minutes=i*30)
        # Slow drift
        lat += 0.001
        lon += 0.001
        
        radius = 2.0 + i * 0.5 # grows 0.5km per 30min
        
        waypoints.append(Waypoint(
            t=t,
            lat=lat,
            lon=lon,
            state=WaypointState(
                intensity=60 + 10 * math.sin(i * 0.5),
                radius_km=radius,
                acres_burned=100 + i * 200
            )
        ))
        
    return CanonicalEvent(
        canonical_id="mock:wildfire_cali",
        source="mock",
        source_event_id="wildfire_cali",
        event_family=EventFamily.NATURAL,
        event_type=EventType.WILDFIRE,
        title="California Wildfire",
        summary="Rapidly expanding vegetation fire in Sonoma County.",
        severity_label=SeverityLabel.MAJOR,
        severity_score=78,
        status=EventStatus.ACTIVE,
        occurred_at=start_time,
        latitude=waypoints[12].lat,
        longitude=waypoints[12].lon,
        is_mobile=True,
        trajectory=TrajectoryData(
            waypoints=waypoints,
            interval_minutes=30,
            current_index=12,
            total_waypoints=len(waypoints)
        ),
        schema_version="v2"
    )

def generate_flood_mississippi() -> CanonicalEvent:
    """Inundation zone expanding downstream."""
    start_time = datetime.now(UTC) - timedelta(days=1)
    waypoints: List[Waypoint] = []
    
    lat, lon = 32.3, -90.9 # Vicksburg, MS
    
    for i in range(24):
        t = start_time + timedelta(hours=i)
        # Downstream drift (South)
        lat -= 0.005
        
        radius = 5.0 + i * 0.2
        
        waypoints.append(Waypoint(
            t=t,
            lat=lat,
            lon=lon,
            state=WaypointState(
                intensity=55,
                radius_km=radius,
                water_level_m=12.5 + i * 0.1
            )
        ))
        
    return CanonicalEvent(
        canonical_id="mock:flood_miss",
        source="mock",
        source_event_id="flood_miss",
        event_family=EventFamily.NATURAL,
        event_type=EventType.FLOOD,
        title="Mississippi Flood",
        summary="Rising water levels causing expanded inundation zones downstream.",
        severity_label=SeverityLabel.MODERATE,
        severity_score=65,
        status=EventStatus.ACTIVE,
        occurred_at=start_time,
        latitude=waypoints[12].lat,
        longitude=waypoints[12].lon,
        is_mobile=True,
        trajectory=TrajectoryData(
            waypoints=waypoints,
            interval_minutes=60,
            current_index=12,
            total_waypoints=len(waypoints)
        ),
        schema_version="v2"
    )

def main():
    events = [
        generate_hurricane_mara(),
        generate_tornado_oklahoma(),
        generate_tsunami_indian_ocean(),
        generate_wildfire_cali(),
        generate_flood_mississippi(),
    ]
    
    sql_template = "INSERT OR REPLACE INTO events (id, canonical_id, source, source_event_id, event_family, event_type, title, summary, severity_label, severity_score, status, occurred_at, detected_at, latitude, longitude, is_mobile, trajectory_bounds, trajectory, normalized_at, schema_version) VALUES "
    
    values = []
    for e in events:
        d = e.to_handoff_dict()
        title_escaped = d['title'].replace("'", "''")
        summary_escaped = d['summary'].replace("'", "''") if d.get('summary') else ""
        row = (
            f"'{d['canonical_id']}'", # use canonical_id as primary id for mock
            f"'{d['canonical_id']}'",
            f"'{d['source']}'",
            f"'{d['source_event_id']}'",
            f"'{d['event_family']}'",
            f"'{d['event_type']}'",
            f"'{title_escaped}'",
            f"'{summary_escaped}'",
            f"'{d['severity_label']}'",
            str(d['severity_score']),
            f"'{d['status']}'",
            f"'{d['occurred_at']}'",
            f"'{d['detected_at']}'",
            str(d['latitude']),
            str(d['longitude']),
            "1",
            f"'{json.dumps(d.get('trajectory_bounds'))}'" if d.get('trajectory_bounds') else "NULL",
            f"'{json.dumps(d['trajectory'])}'",
            f"'{d['normalized_at']}'",
            f"'{d['schema_version']}'"
        )
        values.append("(" + ", ".join(row) + ")")
    
    sql = sql_template + ",\n".join(values) + ";"
    
    with open("services/database/seeds/004_trajectory_mock_data.sql", "w") as f:
        f.write(sql)
    
    print(f"Generated trajectory mock data: services/database/seeds/004_trajectory_mock_data.sql")

if __name__ == "__main__":
    main()
