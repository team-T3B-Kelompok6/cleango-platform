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
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from eta_features import ETA_FEATURES
from risk_features import RISK_FEATURES


def prepare(frame: pd.DataFrame, eta_artifact: dict[str, Any]) -> pd.DataFrame:
    prepared = frame.copy()
    timestamp = pd.to_datetime(prepared["prediction_at"], errors="raise")
    weekday_radians = 2 * math.pi * timestamp.dt.weekday / 7
    prepared["weekday_sin"] = np.sin(weekday_radians)
    prepared["weekday_cos"] = np.cos(weekday_radians)
    eta_features = list(eta_artifact["features"])
    if eta_features != ETA_FEATURES:
        raise ValueError("ETA artifact feature contract does not match ETA_FEATURES")
    eta_seconds = np.maximum(
        0.0, eta_artifact["pipeline"].predict(prepared[eta_features])
    )
    prepared["eta_model_lateness_seconds"] = (
        eta_seconds - prepared["seconds_to_schedule"].to_numpy(dtype=float)
    )
    return prepared


def pipeline(model: Any, scale: bool) -> Pipeline:
    steps: list[tuple[str, Any]] = [("imputer", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scaler", StandardScaler()))
    steps.append(("model", model))
    return Pipeline(steps)


def candidates() -> list[tuple[str, Pipeline]]:
    return [
        (
            "logistic_regression",
            pipeline(
                LogisticRegression(
                    class_weight="balanced", max_iter=2_000, random_state=42
                ),
                True,
            ),
        ),
        (
            "decision_tree",
            pipeline(
                DecisionTreeClassifier(
                    max_depth=7,
                    min_samples_leaf=12,
                    class_weight="balanced",
                    random_state=42,
                ),
                False,
            ),
        ),
        (
            "random_forest",
            pipeline(
                RandomForestClassifier(
                    n_estimators=200,
                    max_depth=10,
                    min_samples_leaf=6,
                    max_features="sqrt",
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=1,
                ),
                False,
            ),
        ),
    ]


def classification_metrics(
    actual: np.ndarray, probability: np.ndarray, threshold: float
) -> dict[str, Any]:
    predicted = (probability >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(actual, predicted, labels=[0, 1]).ravel()
    return {
        "accuracy": float(accuracy_score(actual, predicted)),
        "balanced_accuracy": float(balanced_accuracy_score(actual, predicted)),
        "precision": float(precision_score(actual, predicted, zero_division=0)),
        "recall": float(recall_score(actual, predicted, zero_division=0)),
        "f1": float(f1_score(actual, predicted, zero_division=0)),
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
        "brier_score": float(brier_score_loss(actual, probability)),
        "log_loss": float(log_loss(actual, probability, labels=[0, 1])),
    }


def choose_decision_threshold(actual: np.ndarray, probability: np.ndarray) -> float:
    choices: list[tuple[tuple[float, float, float], float]] = []
    for threshold in np.arange(0.25, 0.751, 0.01):
        report = classification_metrics(actual, probability, float(threshold))
        predicted = (probability >= threshold).astype(int)
        specificity = recall_score(actual, predicted, pos_label=0, zero_division=0)
        if min(float(report["recall"]), float(specificity)) < 0.2:
            continue
        score = (
            float(report["balanced_accuracy"]),
            float(report["f1"]),
            -abs(float(threshold) - 0.5),
        )
        choices.append((score, float(threshold)))
    return max(choices, key=lambda item: item[0])[1] if choices else 0.5


def choose_high_threshold(
    actual: np.ndarray, probability: np.ndarray, decision_threshold: float
) -> float:
    candidates: list[tuple[float, float]] = []
    for threshold in np.arange(max(0.6, decision_threshold + 0.05), 0.951, 0.01):
        predicted = probability >= threshold
        if int(predicted.sum()) < 5:
            continue
        precision = precision_score(actual, predicted.astype(int), zero_division=0)
        if precision >= 0.7:
            candidates.append((float(threshold), float(precision)))
    if candidates:
        return min(candidates, key=lambda item: item[0])[0]
    return min(0.9, max(0.75, decision_threshold + 0.2))


def calibration_bins(actual: np.ndarray, probability: np.ndarray) -> list[dict[str, Any]]:
    bins: list[dict[str, Any]] = []
    for lower in np.linspace(0.0, 0.8, 5):
        upper = lower + 0.2
        mask = (probability >= lower) & (
            probability <= upper if upper >= 1.0 else probability < upper
        )
        if not mask.any():
            continue
        bins.append(
            {
                "range": [round(float(lower), 1), round(float(upper), 1)],
                "rows": int(mask.sum()),
                "mean_probability": float(probability[mask].mean()),
                "observed_late_rate": float(actual[mask].mean()),
            }
        )
    return bins


def fit(model: Pipeline, frame: pd.DataFrame) -> None:
    model.fit(frame[RISK_FEATURES], frame["late_label"].to_numpy(dtype=int))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train and compare CleanGo late-risk classification models."
    )
    parser.add_argument("--data-dir", type=Path, default=Path("data/processed/sample_v2"))
    parser.add_argument(
        "--eta-model", type=Path, default=Path("artifacts/eta_v1/eta_pipeline.joblib")
    )
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/risk_v1"))
    args = parser.parse_args()

    eta_artifact = joblib.load(args.eta_model.resolve())
    data = prepare(
        pd.read_csv(args.data_dir.resolve() / "risk_training.csv"), eta_artifact
    )
    if data.groupby("trip_id")["data_split"].nunique().max() != 1:
        raise ValueError("Data leakage: one trip appears in multiple splits")
    train = data[data.data_split == "train"].copy()
    validation = data[data.data_split == "validation"].copy()
    test = data[data.data_split == "test"].copy()
    if any(frame.empty for frame in (train, validation, test)):
        raise ValueError("Train, validation, and test splits must all contain data")

    comparison: dict[str, dict[str, Any]] = {}
    trained: dict[str, Pipeline] = {}
    thresholds: dict[str, float] = {}
    validation_actual = validation["late_label"].to_numpy(dtype=int)
    for name, model in candidates():
        fit(model, train)
        probability = model.predict_proba(validation[RISK_FEATURES])[:, 1]
        threshold = choose_decision_threshold(validation_actual, probability)
        trained[name] = model
        thresholds[name] = threshold
        comparison[name] = {
            "decision_threshold": threshold,
            "validation": classification_metrics(
                validation_actual, probability, threshold
            ),
        }

    selected_name = max(
        comparison,
        key=lambda name: (
            comparison[name]["validation"]["balanced_accuracy"],
            comparison[name]["validation"]["f1"],
            -comparison[name]["validation"]["confusion_matrix"]["false_negative"],
        ),
    )
    selected = trained[selected_name]
    decision_threshold = thresholds[selected_name]
    validation_probability = selected.predict_proba(validation[RISK_FEATURES])[:, 1]
    high_threshold = choose_high_threshold(
        validation_actual, validation_probability, decision_threshold
    )

    train_and_validation = pd.concat([train, validation], ignore_index=True)
    fit(selected, train_and_validation)
    test_actual = test["late_label"].to_numpy(dtype=int)
    test_probability = selected.predict_proba(test[RISK_FEATURES])[:, 1]
    test_model = classification_metrics(
        test_actual, test_probability, decision_threshold
    )
    simple_rule_probability = (
        test["predicted_lateness_seconds"].to_numpy(dtype=float) > 0
    ).astype(float)
    test_rule = classification_metrics(test_actual, simple_rule_probability, 0.5)
    class_counts = {
        split: {
            "on_time": int((frame.late_label == 0).sum()),
            "late": int((frame.late_label == 1).sum()),
            "late_rate": float(frame.late_label.mean()),
        }
        for split, frame in (
            ("train", train),
            ("validation", validation),
            ("test", test),
        )
    }
    version = "risk-v1"
    report = {
        "card": "AI-02 — Prediksi Risiko Keterlambatan dengan ML Classification",
        "warning": "LaDe proxy trajectories and simulated CleanGo schedules; not validated for real operations.",
        "late_definition": "late_label=1 when simulated actual arrival is later than scheduled_at.",
        "selected_model": selected_name,
        "selection_rule": "Highest validation balanced accuracy, then F1, then fewer false negatives. Test data is used once for final reporting.",
        "features": RISK_FEATURES,
        "target": "late_label",
        "comparison": comparison,
        "thresholds": {
            "low_below": decision_threshold,
            "medium_from": decision_threshold,
            "high_from": high_threshold,
            "selected_on": "validation",
        },
        "class_balance": class_counts,
        "test": {
            "model": test_model,
            "simple_eta_rule": test_rule,
            "calibration_bins": calibration_bins(test_actual, test_probability),
            "rows": len(test),
            "trips": int(test.trip_id.nunique()),
        },
        "split": {
            split: {"rows": len(frame), "trips": int(frame.trip_id.nunique())}
            for split, frame in (
                ("train", train),
                ("validation", validation),
                ("test", test),
            )
        },
        "model_version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": selected,
            "features": RISK_FEATURES,
            "model_name": selected_name,
            "model_version": version,
            "decision_threshold": decision_threshold,
            "high_threshold": high_threshold,
        },
        output / "risk_pipeline.joblib",
    )
    with (output / "metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    with (output / "model_info.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "model_version": version,
                "selected_model": selected_name,
                "features": RISK_FEATURES,
                "target": "late_label",
                "decision_threshold": decision_threshold,
                "high_threshold": high_threshold,
                "fallback": "Use schedule/ETA, departure status, and location freshness rules when the model is unavailable.",
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
