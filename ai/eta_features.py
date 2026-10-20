from __future__ import annotations

import math
from datetime import datetime
from typing import Any


ETA_FEATURES = [
    "baseline_eta_seconds",
    "elapsed_seconds",
    "stopped_duration_seconds",
    "distance_ratio",
    "rolling_speed_ratio",
    "eta_elapsed_ratio",
    "hour_sin",
    "hour_cos",
    "weekday_sin",
    "weekday_cos",
]


def build_eta_features(snapshot: dict[str, Any]) -> dict[str, float]:
    required = [
        "prediction_at",
        "baseline_eta_seconds",
        "elapsed_seconds",
        "stopped_duration_seconds",
        "remaining_distance_m",
        "initial_distance_m",
        "rolling_speed_mps",
        "expected_route_speed_mps",
    ]
    missing = [name for name in required if name not in snapshot]
    if missing:
        raise ValueError(f"Prediction input is missing fields: {', '.join(missing)}")

    numeric = {name: float(snapshot[name]) for name in required if name != "prediction_at"}
    if numeric["initial_distance_m"] <= 0:
        raise ValueError("initial_distance_m must be greater than zero")
    if numeric["expected_route_speed_mps"] <= 0:
        raise ValueError("expected_route_speed_mps must be greater than zero")
    if any(not math.isfinite(value) for value in numeric.values()):
        raise ValueError("All numeric prediction fields must be finite")
    if any(value < 0 for value in numeric.values()):
        raise ValueError("ETA prediction fields cannot be negative")

    prediction_at = datetime.fromisoformat(str(snapshot["prediction_at"]).replace("Z", "+00:00"))
    hour = prediction_at.hour + prediction_at.minute / 60
    hour_radians = 2 * math.pi * hour / 24
    weekday_radians = 2 * math.pi * prediction_at.weekday() / 7
    baseline_eta = numeric["baseline_eta_seconds"]
    elapsed = numeric["elapsed_seconds"]
    return {
        "baseline_eta_seconds": baseline_eta,
        "elapsed_seconds": elapsed,
        "stopped_duration_seconds": numeric["stopped_duration_seconds"],
        "distance_ratio": numeric["remaining_distance_m"] / numeric["initial_distance_m"],
        "rolling_speed_ratio": numeric["rolling_speed_mps"] / numeric["expected_route_speed_mps"],
        "eta_elapsed_ratio": baseline_eta / max(1.0, baseline_eta + elapsed),
        "hour_sin": math.sin(hour_radians),
        "hour_cos": math.cos(hour_radians),
        "weekday_sin": math.sin(weekday_radians),
        "weekday_cos": math.cos(weekday_radians),
    }
