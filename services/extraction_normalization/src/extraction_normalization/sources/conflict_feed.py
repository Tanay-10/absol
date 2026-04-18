"""Conflict / man-made event adapter using ReliefWeb API v2.

ReliefWeb (UN OCHA) provides structured disaster records including
conflict, complex emergencies, and industrial incidents worldwide.

NOTE: Requires a registered appname. Set RELIEFWEB_APPNAME env var.
      Register at https://apidoc.reliefweb.int/parameters#appname
      For hackathon fallback, the adapter returns an empty list if 403.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

import httpx

from extraction_normalization.config import FETCH_TIMEOUT_SECONDS
from extraction_normalization.models.canonical_event import (
    CanonicalEvent,
    EventFamily,
    EventStatus,
    EventType,
    GeometryType,
    SeverityInputs,
    SeverityLabel,
)
from extraction_normalization.sources.base import BaseSource

RELIEFWEB_DISASTERS_URL = "https://api.reliefweb.int/v2/disasters"

# ReliefWeb disaster type → canonical EventType
_RW_TYPE_MAP: dict[str, EventType] = {
    "Drought": EventType.DROUGHT,
    "Earthquake": EventType.EARTHQUAKE,
    "Epidemic": EventType.OTHER,
    "Flood": EventType.FLOOD,
    "Flash Flood": EventType.FLOOD,
    "Tropical Cyclone": EventType.CYCLONE,
    "Tsunami": EventType.TSUNAMI,
    "Volcano": EventType.VOLCANO,
    "Wild Fire": EventType.WILDFIRE,
    "Storm Surge": EventType.STORM,
    "Severe Local Storm": EventType.STORM,
    "Cold Wave": EventType.OTHER,
    "Heat Wave": EventType.OTHER,
    "Complex Emergency": EventType.CONFLICT,
    "Technological Disaster": EventType.INDUSTRIAL,
    "Insect Infestation": EventType.OTHER,
    "Land Slide": EventType.OTHER,
    "Mud Slide": EventType.OTHER,
    "Snow Avalanche": EventType.OTHER,
}

_HUMAN_CAUSED_TYPES = {"Complex Emergency", "Technological Disaster"}


class ConflictFeedSource(BaseSource):
    """Pulls conflict/man-made disaster data from ReliefWeb v2."""

    @property
    def name(self) -> str:
        return "reliefweb"

    async def fetch_raw(self) -> list[dict[str, Any]]:
        appname = os.getenv("RELIEFWEB_APPNAME", "")
        if not appname:
            # Graceful fallback — don't crash the pipeline
            return []

        payload = {
            "appname": appname,
            "limit": 50,
            "preset": "latest",
            "fields": {
                "include": [
                    "name", "type", "country", "date", "glide",
                    "status", "primary_type", "description",
                ]
            },
            "filter": {
                "operator": "OR",
                "conditions": [
                    {"field": "type.name", "value": "Complex Emergency"},
                    {"field": "type.name", "value": "Technological Disaster"},
                ],
            },
        }

        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
            resp = await client.post(RELIEFWEB_DISASTERS_URL, json=payload)
            if resp.status_code == 403:
                return []
            resp.raise_for_status()
            data = resp.json()
        return data.get("data", [])

    def normalize(self, raw: dict[str, Any]) -> CanonicalEvent | None:
        eid = str(raw.get("id", ""))
        fields = raw.get("fields", {})
        if not eid or not fields:
            return None

        name = fields.get("name", "Unknown disaster")

        # Primary type
        primary_type_list = fields.get("primary_type", [])
        primary_type_name = ""
        if isinstance(primary_type_list, list) and primary_type_list:
            primary_type_name = primary_type_list[0].get("name", "")
        elif isinstance(primary_type_list, dict):
            primary_type_name = primary_type_list.get("name", "")

        event_type = _RW_TYPE_MAP.get(primary_type_name, EventType.OTHER)
        event_family = (
            EventFamily.HUMAN_CAUSED
            if primary_type_name in _HUMAN_CAUSED_TYPES
            else EventFamily.NATURAL
        )

        # Country / location
        countries = fields.get("country", [])
        country_codes = []
        region_name = None
        if countries and isinstance(countries, list):
            country_codes = [c.get("iso3", "") for c in countries if c.get("iso3")]
            region_name = countries[0].get("name") if countries else None

        # Date
        date_info = fields.get("date", [])
        occurred_at = None
        if isinstance(date_info, list) and date_info:
            occurred_at = _parse_rw_date(date_info[0].get("created"))
        elif isinstance(date_info, dict):
            occurred_at = _parse_rw_date(date_info.get("created"))

        # Status
        status_list = fields.get("status", "")
        status = EventStatus.ACTIVE if "current" in str(status_list).lower() else EventStatus.ENDED

        return CanonicalEvent(
            canonical_id=f"reliefweb:{eid}",
            source="reliefweb",
            source_event_id=eid,
            event_family=event_family,
            event_type=event_type,
            event_subtype=primary_type_name or None,
            title=name,
            summary=fields.get("description"),
            severity_label=SeverityLabel.MAJOR,  # ReliefWeb disasters are inherently significant
            severity_score=65,
            status=status,
            confidence=0.9,
            occurred_at=occurred_at,
            geometry_type=GeometryType.ADMIN_AREA,
            latitude=None,
            longitude=None,
            region_name=region_name,
            country_codes=country_codes,
            severity_inputs=SeverityInputs(alert_level=primary_type_name),
            source_url=f"https://reliefweb.int/disaster/{eid}",
            raw_payload_ref=None,
        )


def _parse_rw_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
