from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import pandas as pd


CATEGORICAL_FEATURES = ["service_type", "district", "size_unit"]
NUMERIC_FEATURES = [
    "area_m2",
    "item_count",
    "cleaner_count",
    "condition_level",
    "add_on_count",
    "start_hour",
    "day_of_week",
    "sop_base_minutes",
    "scheduled_duration_minutes",
]
WORK_DURATION_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def _number(
    snapshot: dict[str, Any], name: str, minimum: float, maximum: float
) -> float:
    if name not in snapshot or isinstance(snapshot[name], bool):
        raise ValueError(f"{name} must be a number")
    value = float(snapshot[name])
    if not math.isfinite(value) or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def build_work_duration_features(
    snapshot: dict[str, Any],
) -> tuple[pd.DataFrame, datetime]:
    if not isinstance(snapshot, dict):
        raise ValueError("Prediction input must be a JSON object")

    strings: dict[str, str] = {}
    for name in CATEGORICAL_FEATURES:
        value = snapshot.get(name)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{name} is required")
        strings[name] = value.strip()

    raw_started_at = snapshot.get("started_at")
    if not isinstance(raw_started_at, str) or not raw_started_at.strip():
        raise ValueError("started_at must be an ISO 8601 timestamp")
    try:
        started_at = datetime.fromisoformat(raw_started_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("started_at must be an ISO 8601 timestamp") from error
    if started_at.tzinfo is None:
        raise ValueError("started_at must include a timezone")
    model_time = started_at.astimezone(timezone.utc)

    features = {
        **strings,
        "area_m2": _number(snapshot, "area_m2", 0, 10_000),
        "item_count": _number(snapshot, "item_count", 0, 1_000),
        "cleaner_count": _number(snapshot, "cleaner_count", 1, 50),
        "condition_level": _number(snapshot, "condition_level", 1, 3),
        "add_on_count": _number(snapshot, "add_on_count", 0, 100),
        "start_hour": model_time.hour,
        "day_of_week": model_time.weekday(),
        "sop_base_minutes": _number(snapshot, "sop_base_minutes", 5, 1_440),
        "scheduled_duration_minutes": _number(
            snapshot, "scheduled_duration_minutes", 5, 1_440
        ),
    }
    return pd.DataFrame([features], columns=WORK_DURATION_FEATURES), started_at
