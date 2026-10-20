from __future__ import annotations

import math
from datetime import datetime
from typing import Any


RISK_FEATURES = [
    "eta_model_lateness_seconds",
    "eta_schedule_ratio",
    "predicted_lateness_seconds",
    "elapsed_seconds",
    "stopped_duration_seconds",
    "distance_ratio",
    "rolling_speed_ratio",
    "location_age_seconds",
    "has_departed",
    "hour_sin",
    "hour_cos",
    "weekday_sin",
    "weekday_cos",
]


def build_risk_features(snapshot: dict[str, Any]) -> dict[str, float]:
    required = [
        "prediction_at",
        "eta_seconds",
        "baseline_eta_seconds",
        "seconds_to_schedule",
        "elapsed_seconds",
        "stopped_duration_seconds",
        "remaining_distance_m",
        "initial_distance_m",
        "rolling_speed_mps",
        "expected_route_speed_mps",
        "location_age_seconds",
        "has_departed",
    ]
    missing = [name for name in required if name not in snapshot]
    if missing:
        raise ValueError(f"Prediction input is missing fields: {', '.join(missing)}")

    numeric_names = [
        name
        for name in required
        if name not in {"prediction_at", "has_departed"}
    ]
    numeric = {name: float(snapshot[name]) for name in numeric_names}
    if numeric["seconds_to_schedule"] <= 0:
        raise ValueError("seconds_to_schedule must be greater than zero")
    if numeric["initial_distance_m"] <= 0:
        raise ValueError("initial_distance_m must be greater than zero")
    if numeric["expected_route_speed_mps"] <= 0:
        raise ValueError("expected_route_speed_mps must be greater than zero")
    if any(not math.isfinite(value) for value in numeric.values()):
        raise ValueError("All numeric prediction fields must be finite")
    if any(value < 0 for value in numeric.values()):
        raise ValueError("Risk prediction fields cannot be negative")

    departed = snapshot["has_departed"]
    if not isinstance(departed, bool):
        raise ValueError("has_departed must be a boolean")

    try:
        prediction_at = datetime.fromisoformat(
            str(snapshot["prediction_at"]).replace("Z", "+00:00")
        )
    except ValueError as error:
        raise ValueError("prediction_at must be a valid ISO-8601 timestamp") from error

    hour = prediction_at.hour + prediction_at.minute / 60
    hour_radians = 2 * math.pi * hour / 24
    weekday_radians = 2 * math.pi * prediction_at.weekday() / 7
    schedule = numeric["seconds_to_schedule"]
    return {
        "eta_model_lateness_seconds": numeric["eta_seconds"] - schedule,
        "eta_schedule_ratio": numeric["baseline_eta_seconds"] / schedule,
        "predicted_lateness_seconds": numeric["baseline_eta_seconds"] - schedule,
        "elapsed_seconds": numeric["elapsed_seconds"],
        "stopped_duration_seconds": numeric["stopped_duration_seconds"],
        "distance_ratio": numeric["remaining_distance_m"]
        / numeric["initial_distance_m"],
        "rolling_speed_ratio": numeric["rolling_speed_mps"]
        / numeric["expected_route_speed_mps"],
        "location_age_seconds": numeric["location_age_seconds"],
        "has_departed": float(departed),
        "hour_sin": math.sin(hour_radians),
        "hour_cos": math.cos(hour_radians),
        "weekday_sin": math.sin(weekday_radians),
        "weekday_cos": math.cos(weekday_radians),
    }
