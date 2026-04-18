"""Maps source-specific event type strings to canonical EventType + EventFamily."""

from __future__ import annotations

from dataclasses import dataclass

from extraction_normalization.models.canonical_event import EventFamily, EventType

# ── Mapping Table ────────────────────────────────────────────────────────────

_RAW_TO_CANONICAL: dict[str, tuple[EventType, EventFamily]] = {}


def _register(keys: list[str], event_type: EventType, family: EventFamily) -> None:
    for k in keys:
        _RAW_TO_CANONICAL[k.lower()] = (event_type, family)


# Natural hazards
_register(["eq", "earthquake"], EventType.EARTHQUAKE, EventFamily.NATURAL)
_register(["fl", "flood", "flash_flood", "flash flood", "riverine flood"], EventType.FLOOD, EventFamily.NATURAL)
_register(["wf", "wildfire", "fire", "forest_fire", "forest fire"], EventType.WILDFIRE, EventFamily.NATURAL)
_register(["tsu", "tsunami"], EventType.TSUNAMI, EventFamily.NATURAL)
_register(["to", "tornado"], EventType.TORNADO, EventFamily.NATURAL)
_register(["tc", "cyclone", "tropical_cyclone", "tropical cyclone", "hurricane", "typhoon"], EventType.CYCLONE, EventFamily.NATURAL)
_register(["storm", "severe_storm", "severe storm", "thunderstorm"], EventType.STORM, EventFamily.NATURAL)
_register(["vo", "volcano", "volcanic_eruption", "volcanic eruption"], EventType.VOLCANO, EventFamily.NATURAL)
_register(["dr", "drought"], EventType.DROUGHT, EventFamily.NATURAL)

# Human-caused
_register(["conflict", "war", "armed_conflict", "armed conflict", "battle", "violence"], EventType.CONFLICT, EventFamily.HUMAN_CAUSED)
_register(["terrorism", "terror", "attack", "bombing", "explosion"], EventType.TERRORISM, EventFamily.HUMAN_CAUSED)
_register(["industrial", "industrial_accident", "industrial accident", "chemical_spill", "chemical spill", "oil_spill", "oil spill"], EventType.INDUSTRIAL, EventFamily.HUMAN_CAUSED)


# ── Public API ───────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class MappedType:
    event_type: EventType
    event_family: EventFamily


def map_event_type(raw_type: str) -> MappedType:
    """Resolve a raw source type string to its canonical type and family.

    Falls back to EventType.OTHER / EventFamily.NATURAL when unrecognised.
    """
    key = raw_type.strip().lower()
    if key in _RAW_TO_CANONICAL:
        et, ef = _RAW_TO_CANONICAL[key]
        return MappedType(event_type=et, event_family=ef)
    return MappedType(event_type=EventType.OTHER, event_family=EventFamily.NATURAL)


def registered_keys() -> list[str]:
    """Return all currently registered raw-type keys (useful for tests)."""
    return sorted(_RAW_TO_CANONICAL.keys())
