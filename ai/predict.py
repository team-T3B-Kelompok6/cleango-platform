from __future__ import annotations

import argparse
import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np


def load_model(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        model = json.load(handle)
    required = {"schema_version", "model_type", "target", "features", "mean", "scale", "intercept", "coefficients"}
    missing = sorted(required - model.keys())
    if missing:
        raise ValueError(f"Model {path.name} is missing fields: {', '.join(missing)}")
    size = len(model["features"])
    if not (len(model["mean"]) == len(model["scale"]) == len(model["coefficients"]) == size):
        raise ValueError(f"Model {path.name} has inconsistent feature dimensions")
    return model


def build_live_features(snapshot: dict[str, Any]) -> dict[str, float]:
    required = [
        "prediction_at",
        "baseline_eta_seconds",
        "elapsed_seconds",
        "stopped_duration_seconds",
        "remaining_distance_m",
        "initial_distance_m",
        "rolling_speed_mps",
        "expected_route_speed_mps",
        "seconds_to_schedule",
    ]
    missing = [name for name in required if name not in snapshot]
    if missing:
        raise ValueError(f"Prediction input is missing fields: {', '.join(missing)}")

    numeric = {name: float(snapshot[name]) for name in required if name != "prediction_at"}
    if numeric["initial_distance_m"] <= 0:
        raise ValueError("initial_distance_m must be greater than zero")
    if numeric["expected_route_speed_mps"] <= 0:
        raise ValueError("expected_route_speed_mps must be greater than zero")
    if numeric["seconds_to_schedule"] <= 0:
        raise ValueError("Classification is only valid before the scheduled time")
    if any(not math.isfinite(value) for value in numeric.values()):
        raise ValueError("All numeric prediction fields must be finite")

    prediction_at = datetime.fromisoformat(str(snapshot["prediction_at"]).replace("Z", "+00:00"))
    hour = prediction_at.hour + prediction_at.minute / 60
    hour_radians = 2 * math.pi * hour / 24
    baseline_eta = numeric["baseline_eta_seconds"]
    elapsed = numeric["elapsed_seconds"]
    seconds_to_schedule = numeric["seconds_to_schedule"]
    return {
        "baseline_eta_seconds": baseline_eta,
        "elapsed_seconds": elapsed,
        "stopped_duration_seconds": numeric["stopped_duration_seconds"],
        "distance_ratio": numeric["remaining_distance_m"] / numeric["initial_distance_m"],
        "rolling_speed_ratio": numeric["rolling_speed_mps"] / numeric["expected_route_speed_mps"],
        "eta_elapsed_ratio": baseline_eta / max(1.0, baseline_eta + elapsed),
        "eta_schedule_ratio": baseline_eta / max(1.0, seconds_to_schedule),
        "predicted_lateness_seconds": baseline_eta - seconds_to_schedule,
        "hour_sin": math.sin(hour_radians),
        "hour_cos": math.cos(hour_radians),
    }


def predict_model(model: dict[str, Any], features: dict[str, float]) -> float:
    missing = [name for name in model["features"] if name not in features]
    if missing:
        raise ValueError(f"Required model features are missing: {', '.join(missing)}")
    values = np.array([features[name] for name in model["features"]], dtype=float)
    mean = np.array(model["mean"], dtype=float)
    scale = np.array(model["scale"], dtype=float)
    coefficients = np.array(model["coefficients"], dtype=float)
    score = float(model["intercept"] + ((values - mean) / scale) @ coefficients)
    if model["model_type"] == "ridge_regression":
        return max(0.0, score)
    if model["model_type"] == "logistic_regression":
        return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, score))))
    raise ValueError(f"Unsupported model type: {model['model_type']}")


def predict_snapshot(snapshot: dict[str, Any], eta_model: dict[str, Any], risk_model: dict[str, Any]) -> dict[str, Any]:
    features = build_live_features(snapshot)
    eta_seconds = predict_model(eta_model, features)
    features["eta_model_lateness_seconds"] = eta_seconds - float(snapshot["seconds_to_schedule"])
    late_probability = predict_model(risk_model, features)
    threshold = float(risk_model.get("decision_threshold", 0.5))
    late_prediction = late_probability >= threshold
    risk_level = "high" if late_probability >= max(0.75, threshold) else "medium" if late_prediction else "low"
    return {
        "eta_seconds": round(eta_seconds, 1),
        "late_probability": round(late_probability, 6),
        "late_prediction": bool(late_prediction),
        "risk_level": risk_level,
        "decision_threshold": round(threshold, 6),
        "warning": "Demo model: LaDe proxy trajectories and simulated schedules, not validated on real CleanGo trips.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run CleanGo ETA regression and lateness classification.")
    parser.add_argument("--input", type=Path, default=Path("sample_prediction_input.json"))
    parser.add_argument("--model-dir", type=Path, default=Path("artifacts/sample_v2"))
    args = parser.parse_args()
    with args.input.resolve().open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)
    model_dir = args.model_dir.resolve()
    result = predict_snapshot(
        snapshot,
        load_model(model_dir / "eta_ridge_model.json"),
        load_model(model_dir / "late_logistic_model.json"),
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
