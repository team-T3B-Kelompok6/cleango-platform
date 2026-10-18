from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeRegressor

from work_duration_features import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    WORK_DURATION_FEATURES,
)


TARGET = "actual_duration_minutes"
MODEL_VERSION = "work-duration-v1-synthetic"


def load_data(source: Path) -> pd.DataFrame:
    frame = pd.read_csv(source).rename(
        columns={
            "sop_base_minutes_ASSUMED": "sop_base_minutes",
            "actual_duration_minutes_SYNTHETIC": TARGET,
        }
    )
    required = {
        "job_id",
        "record_source",
        "started_at",
        TARGET,
        *WORK_DURATION_FEATURES,
    }
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Dataset is missing columns: {', '.join(missing)}")

    frame["started_at"] = pd.to_datetime(frame["started_at"], utc=True, errors="coerce")
    frame["start_hour"] = frame["started_at"].dt.hour
    frame["day_of_week"] = frame["started_at"].dt.dayofweek
    for column in [*NUMERIC_FEATURES, TARGET]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = frame.dropna(subset=["job_id", "started_at", TARGET, *WORK_DURATION_FEATURES])
    frame = frame.drop_duplicates(subset=["job_id"], keep="last")
    frame = frame[
        (frame[TARGET] > 0)
        & frame["cleaner_count"].between(1, 50)
        & frame["condition_level"].between(1, 3)
        & frame["sop_base_minutes"].between(5, 1_440)
        & frame["scheduled_duration_minutes"].between(5, 1_440)
    ].copy()
    frame = frame.sort_values(["started_at", "job_id"]).reset_index(drop=True)
    if len(frame) < 100:
        raise ValueError("At least 100 valid rows are required")
    return frame


def split_by_time(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_end = int(len(frame) * 0.70)
    validation_end = int(len(frame) * 0.85)
    return (
        frame.iloc[:train_end].copy(),
        frame.iloc[train_end:validation_end].copy(),
        frame.iloc[validation_end:].copy(),
    )


def make_preprocessor() -> ColumnTransformer:
    categorical = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("one_hot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    numeric = Pipeline([("imputer", SimpleImputer(strategy="median"))])
    return ColumnTransformer(
        [
            ("categorical", categorical, CATEGORICAL_FEATURES),
            ("numeric", numeric, NUMERIC_FEATURES),
        ]
    )


def candidates() -> dict[str, Any]:
    return {
        "linear_regression": LinearRegression(),
        "decision_tree": DecisionTreeRegressor(
            max_depth=10, min_samples_leaf=5, random_state=42
        ),
        "random_forest": RandomForestRegressor(
            n_estimators=250,
            max_depth=14,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=1,
        ),
    }


def metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "mae_minutes": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse_minutes": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "r2": round(float(r2_score(y_true, y_pred)), 6),
    }


def train(source: Path, ai_root: Path) -> dict[str, Any]:
    frame = load_data(source)
    train_frame, validation_frame, test_frame = split_by_time(frame)
    processed = ai_root / "data" / "processed" / "work_duration_v1"
    artifact_dir = ai_root / "artifacts" / "work_duration_v1"
    processed.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    for name, split in (
        ("train", train_frame),
        ("validation", validation_frame),
        ("test", test_frame),
    ):
        split.to_csv(processed / f"{name}.csv", index=False)

    validation_results: dict[str, dict[str, float]] = {}
    for name, estimator in candidates().items():
        pipeline = Pipeline(
            [("preprocess", make_preprocessor()), ("model", estimator)]
        )
        pipeline.fit(train_frame[WORK_DURATION_FEATURES], train_frame[TARGET])
        validation_results[name] = metrics(
            validation_frame[TARGET], pipeline.predict(validation_frame[WORK_DURATION_FEATURES])
        )

    validation_baseline = metrics(
        validation_frame[TARGET], validation_frame["scheduled_duration_minutes"].to_numpy()
    )
    selected_name = min(
        validation_results, key=lambda name: validation_results[name]["mae_minutes"]
    )
    combined = pd.concat([train_frame, validation_frame], ignore_index=True)
    final_pipeline = Pipeline(
        [
            ("preprocess", make_preprocessor()),
            ("model", candidates()[selected_name]),
        ]
    )
    final_pipeline.fit(combined[WORK_DURATION_FEATURES], combined[TARGET])
    test_result = metrics(
        test_frame[TARGET], final_pipeline.predict(test_frame[WORK_DURATION_FEATURES])
    )
    test_baseline = metrics(
        test_frame[TARGET], test_frame["scheduled_duration_minutes"].to_numpy()
    )
    ready_for_demo = (
        validation_results[selected_name]["mae_minutes"]
        < validation_baseline["mae_minutes"]
        and test_result["mae_minutes"] < test_baseline["mae_minutes"]
    )

    artifact = {
        "pipeline": final_pipeline,
        "features": WORK_DURATION_FEATURES,
        "model_name": selected_name,
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_source": "SYNTHETIC_ONLY",
        "known_services": sorted(frame["service_type"].unique().tolist()),
        "ready_for_demo": ready_for_demo,
        "production_ready": False,
    }
    joblib.dump(artifact, artifact_dir / "duration_pipeline.joblib")
    report = {
        "model_version": MODEL_VERSION,
        "selected_model": selected_name,
        "validation_candidates": validation_results,
        "validation_sop_baseline": validation_baseline,
        "test_selected_model": test_result,
        "test_sop_baseline": test_baseline,
        "ready_for_demo": ready_for_demo,
        "production_ready": False,
        "rows": {
            "train": len(train_frame),
            "validation": len(validation_frame),
            "test": len(test_frame),
        },
        "leakage_control": "chronological split; completion fields are excluded from features",
    }
    (artifact_dir / "metrics.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the CleanGo work-duration model")
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--ai-root", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    print(json.dumps(train(args.source, args.ai_root), indent=2))


if __name__ == "__main__":
    main()
