from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeRegressor

from eta_features import ETA_FEATURES


def metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    error = np.asarray(predicted, dtype=float) - np.asarray(actual, dtype=float)
    return {
        "mae_seconds": float(np.mean(np.abs(error))),
        "rmse_seconds": float(math.sqrt(np.mean(error**2))),
    }


def prepare(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = frame.copy()
    timestamp = pd.to_datetime(prepared["prediction_at"], errors="raise")
    weekday_radians = 2 * math.pi * timestamp.dt.weekday / 7
    prepared["weekday_sin"] = np.sin(weekday_radians)
    prepared["weekday_cos"] = np.cos(weekday_radians)
    return prepared


def trip_weights(frame: pd.DataFrame) -> np.ndarray:
    counts = frame.groupby("trip_id")["trip_id"].transform("count").to_numpy(dtype=float)
    weights = 1.0 / counts
    return weights / weights.mean()


def pipeline(model: Any, scale: bool) -> Pipeline:
    steps: list[tuple[str, Any]] = [("imputer", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scaler", StandardScaler()))
    steps.append(("model", model))
    return Pipeline(steps)


def candidates() -> list[tuple[str, Pipeline]]:
    return [
        ("linear_regression", pipeline(LinearRegression(), True)),
        ("ridge_regression", pipeline(Ridge(alpha=10.0), True)),
        (
            "decision_tree",
            pipeline(
                DecisionTreeRegressor(max_depth=12, min_samples_leaf=12, random_state=42),
                False,
            ),
        ),
        (
            "random_forest",
            pipeline(
                RandomForestRegressor(
                    n_estimators=160,
                    max_depth=16,
                    min_samples_leaf=6,
                    max_features=0.8,
                    random_state=42,
                    n_jobs=1,
                ),
                False,
            ),
        ),
    ]


def fit(model: Pipeline, frame: pd.DataFrame) -> None:
    model.fit(
        frame[ETA_FEATURES],
        frame["actual_remaining_seconds"],
        model__sample_weight=trip_weights(frame),
    )


def evaluate(model: Pipeline, frame: pd.DataFrame) -> dict[str, float]:
    predicted = np.maximum(0.0, model.predict(frame[ETA_FEATURES]))
    return metrics(frame["actual_remaining_seconds"].to_numpy(dtype=float), predicted)


def condition_metrics(model: Pipeline, test: pd.DataFrame) -> dict[str, dict[str, float | int]]:
    predicted = np.maximum(0.0, model.predict(test[ETA_FEATURES]))
    actual = test["actual_remaining_seconds"].to_numpy(dtype=float)
    masks = {
        "moving": test["rolling_speed_ratio"].to_numpy(dtype=float) > 0.10,
        "stopped": test["rolling_speed_ratio"].to_numpy(dtype=float) <= 0.10,
        "distance_near": test["distance_ratio"].to_numpy(dtype=float) <= 0.33,
        "distance_middle": test["distance_ratio"].between(0.33, 0.66).to_numpy(),
        "distance_far": test["distance_ratio"].to_numpy(dtype=float) > 0.66,
    }
    result: dict[str, dict[str, float | int]] = {}
    for name, mask in masks.items():
        selected = np.asarray(mask, dtype=bool)
        if not selected.any():
            continue
        result[name] = {**metrics(actual[selected], predicted[selected]), "rows": int(selected.sum())}
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and compare CleanGo ETA regression models.")
    parser.add_argument("--data-dir", type=Path, default=Path("data/processed/sample_v2"))
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/eta_v1"))
    args = parser.parse_args()

    data = prepare(pd.read_csv(args.data_dir.resolve() / "eta_training.csv"))
    if data.groupby("trip_id")["data_split"].nunique().max() != 1:
        raise ValueError("Data leakage: one trip appears in multiple splits")
    train = data[data.data_split == "train"].copy()
    validation = data[data.data_split == "validation"].copy()
    test = data[data.data_split == "test"].copy()
    if any(frame.empty for frame in (train, validation, test)):
        raise ValueError("Train, validation, and test splits must all contain data")

    comparison: dict[str, dict[str, dict[str, float]]] = {}
    trained: dict[str, Pipeline] = {}
    for name, model in candidates():
        fit(model, train)
        trained[name] = model
        comparison[name] = {
            "train": evaluate(model, train),
            "validation": evaluate(model, validation),
        }

    selected_name = min(
        comparison,
        key=lambda name: (
            comparison[name]["validation"]["mae_seconds"],
            comparison[name]["validation"]["rmse_seconds"],
        ),
    )
    selected = trained[selected_name]
    train_and_validation = pd.concat([train, validation], ignore_index=True)
    fit(selected, train_and_validation)

    test_model = evaluate(selected, test)
    test_baseline = metrics(
        test["actual_remaining_seconds"].to_numpy(dtype=float),
        test["baseline_eta_seconds"].to_numpy(dtype=float),
    )
    model_better_than_baseline = test_model["mae_seconds"] < test_baseline["mae_seconds"]
    version = "eta-v1"
    report = {
        "card": "AI-01 — Tracking Cleaner dan Prediksi ETA Menggunakan ML Regression",
        "warning": "LaDe proxy trajectories and simulated CleanGo schedules; not validated for real operations.",
        "selected_model": selected_name,
        "selection_rule": "Lowest validation MAE, then RMSE. Test data is used once for final reporting.",
        "features": ETA_FEATURES,
        "target": "actual_remaining_seconds",
        "maps_baseline": "OSRM in live inference; training uses the AI-00 routing-speed proxy.",
        "comparison": comparison,
        "test": {
            "model": test_model,
            "osrm_proxy_baseline": test_baseline,
            "model_better_than_baseline": model_better_than_baseline,
            "rows": len(test),
            "trips": int(test.trip_id.nunique()),
        },
        "condition_errors": condition_metrics(selected, test),
        "split": {
            split: {"rows": len(frame), "trips": int(frame.trip_id.nunique())}
            for split, frame in (("train", train), ("validation", validation), ("test", test))
        },
        "model_version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": selected,
            "features": ETA_FEATURES,
            "model_name": selected_name,
            "model_version": version,
            "model_better_than_baseline": model_better_than_baseline,
        },
        output / "eta_pipeline.joblib",
    )
    with (output / "metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    with (output / "model_info.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "model_version": version,
                "selected_model": selected_name,
                "features": ETA_FEATURES,
                "target": "actual_remaining_seconds",
                "fallback": "Use OSRM duration when the model is unavailable or does not beat baseline MAE.",
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
