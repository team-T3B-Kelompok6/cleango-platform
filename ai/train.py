from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


ETA_FEATURES = [
    "baseline_eta_seconds",
    "elapsed_seconds",
    "stopped_duration_seconds",
    "distance_ratio",
    "rolling_speed_ratio",
    "eta_elapsed_ratio",
    "hour_sin",
    "hour_cos",
]
RISK_FEATURES = [
    "eta_model_lateness_seconds",
    "eta_schedule_ratio",
    "predicted_lateness_seconds",
    "elapsed_seconds",
    "stopped_duration_seconds",
    "distance_ratio",
    "rolling_speed_ratio",
    "hour_sin",
    "hour_cos",
]


def standardize_fit(frame: pd.DataFrame, features: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    values = frame[features].to_numpy(dtype=float)
    mean = values.mean(axis=0)
    scale = values.std(axis=0)
    scale[scale == 0] = 1.0
    return (values - mean) / scale, mean, scale


def standardize_apply(frame: pd.DataFrame, features: list[str], mean: np.ndarray, scale: np.ndarray) -> np.ndarray:
    return (frame[features].to_numpy(dtype=float) - mean) / scale


def fit_ridge(
    x: np.ndarray,
    y: np.ndarray,
    regularization: float = 1.0,
    sample_weight: np.ndarray | None = None,
) -> np.ndarray:
    design = np.column_stack([np.ones(len(x)), x])
    if sample_weight is not None:
        root_weight = np.sqrt(sample_weight).reshape(-1, 1)
        design = design * root_weight
        y = y * root_weight[:, 0]
    penalty = np.eye(design.shape[1]) * regularization
    penalty[0, 0] = 0.0
    return np.linalg.solve(design.T @ design + penalty, design.T @ y)


def predict_linear(x: np.ndarray, weights: np.ndarray) -> np.ndarray:
    return np.maximum(0.0, np.column_stack([np.ones(len(x)), x]) @ weights)


def sigmoid(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(values, -30, 30)))


def fit_logistic(
    x: np.ndarray,
    y: np.ndarray,
    iterations: int = 500,
    learning_rate: float = 0.08,
    regularization: float = 0.01,
) -> np.ndarray:
    design = np.column_stack([np.ones(len(x)), x])
    weights = np.zeros(design.shape[1])
    positives = max(1, int(y.sum()))
    negatives = max(1, len(y) - positives)
    sample_weight = np.where(y == 1, len(y) / (2 * positives), len(y) / (2 * negatives))
    for _ in range(iterations):
        probabilities = sigmoid(design @ weights)
        gradient = design.T @ ((probabilities - y) * sample_weight) / len(y)
        gradient[1:] += regularization * weights[1:]
        weights -= learning_rate * gradient
    return weights


def predict_probability(x: np.ndarray, weights: np.ndarray) -> np.ndarray:
    return sigmoid(np.column_stack([np.ones(len(x)), x]) @ weights)


def regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    error = predicted - actual
    return {
        "mae_seconds": float(np.mean(np.abs(error))),
        "rmse_seconds": float(math.sqrt(np.mean(error**2))),
    }


def classification_metrics(
    actual: np.ndarray,
    probability: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, float | int]:
    predicted = (probability >= threshold).astype(int)
    tp = int(((predicted == 1) & (actual == 1)).sum())
    tn = int(((predicted == 0) & (actual == 0)).sum())
    fp = int(((predicted == 1) & (actual == 0)).sum())
    fn = int(((predicted == 0) & (actual == 1)).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    specificity = tn / (tn + fp) if tn + fp else 0.0
    return {
        "accuracy": (tp + tn) / len(actual),
        "precision": precision,
        "recall": recall,
        "specificity": specificity,
        "balanced_accuracy": (recall + specificity) / 2,
        "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
        "true_positive": tp,
        "true_negative": tn,
        "false_positive": fp,
        "false_negative": fn,
    }


def assert_no_trip_leakage(frame: pd.DataFrame) -> None:
    counts = frame.groupby("trip_id")["data_split"].nunique()
    if int(counts.max()) != 1:
        raise ValueError("Data leakage: at least one trip occurs in multiple splits")


def serialize_model(
    path: Path,
    model_type: str,
    target: str,
    features: list[str],
    mean: np.ndarray,
    scale: np.ndarray,
    weights: np.ndarray,
    decision_threshold: float | None = None,
) -> None:
    payload = {
        "schema_version": 2,
        "model_type": model_type,
        "target": target,
        "features": features,
        "mean": mean.tolist(),
        "scale": scale.tolist(),
        "intercept": float(weights[0]),
        "coefficients": weights[1:].tolist(),
        "training_scope": "LaDe proxy trajectories with simulated CleanGo schedules; demo/learning only.",
    }
    if decision_threshold is not None:
        payload["decision_threshold"] = decision_threshold
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate the CleanGo AI-00 baseline models.")
    parser.add_argument("--data-dir", type=Path, default=Path("data/processed/sample_v2"))
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/sample_v2"))
    args = parser.parse_args()
    data_dir = args.data_dir.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    eta = pd.read_csv(data_dir / "eta_training.csv")
    risk = pd.read_csv(data_dir / "risk_training.csv")
    assert_no_trip_leakage(eta)
    assert_no_trip_leakage(risk)

    eta_train = eta[eta.data_split == "train"]
    x_train, eta_mean, eta_scale = standardize_fit(eta_train, ETA_FEATURES)
    eta_target = eta_train["actual_remaining_seconds"].to_numpy(dtype=float)
    trip_counts = eta_train.groupby("trip_id")["trip_id"].transform("count").to_numpy(dtype=float)
    eta_sample_weight = (1.0 / trip_counts)
    eta_sample_weight /= eta_sample_weight.mean()
    eta_validation = eta[eta.data_split == "validation"]
    x_eta_validation = standardize_apply(eta_validation, ETA_FEATURES, eta_mean, eta_scale)
    eta_validation_actual = eta_validation["actual_remaining_seconds"].to_numpy(dtype=float)
    regularization_grid = [0.1, 1.0, 10.0, 100.0, 1000.0]
    ridge_candidates = []
    for regularization in regularization_grid:
        candidate_weights = fit_ridge(x_train, eta_target, regularization, eta_sample_weight)
        candidate_prediction = predict_linear(x_eta_validation, candidate_weights)
        candidate_metrics = regression_metrics(eta_validation_actual, candidate_prediction)
        ridge_candidates.append((candidate_metrics["mae_seconds"], regularization, candidate_weights))
    _, selected_regularization, eta_weights = min(ridge_candidates, key=lambda item: (item[0], item[1]))
    eta_metrics: dict[str, dict] = {}
    for split in ("train", "validation", "test"):
        frame = eta[eta.data_split == split]
        actual = frame["actual_remaining_seconds"].to_numpy(dtype=float)
        prediction = predict_linear(standardize_apply(frame, ETA_FEATURES, eta_mean, eta_scale), eta_weights)
        eta_metrics[split] = {
            "model": regression_metrics(actual, prediction),
            "maps_proxy_baseline": regression_metrics(actual, frame["baseline_eta_seconds"].to_numpy(dtype=float)),
            "rows": len(frame),
            "trips": int(frame["trip_id"].nunique()),
        }

    # Stack the ETA model into the classifier. At inference the same ETA model is
    # evaluated first, then compared with the remaining time to the schedule.
    risk["eta_model_lateness_seconds"] = (
        predict_linear(standardize_apply(risk, ETA_FEATURES, eta_mean, eta_scale), eta_weights)
        - risk["seconds_to_schedule"].to_numpy(dtype=float)
    )
    risk_train = risk[risk.data_split == "train"]
    x_risk_train, risk_mean, risk_scale = standardize_fit(risk_train, RISK_FEATURES)
    risk_weights = fit_logistic(x_risk_train, risk_train["late_label"].to_numpy(dtype=float))
    risk_validation = risk[risk.data_split == "validation"]
    validation_actual = risk_validation["late_label"].to_numpy(dtype=int)
    validation_probability = predict_probability(
        standardize_apply(risk_validation, RISK_FEATURES, risk_mean, risk_scale),
        risk_weights,
    )
    threshold_candidates = []
    for threshold in np.arange(0.30, 0.701, 0.01):
        candidate = classification_metrics(validation_actual, validation_probability, float(threshold))
        # Reject degenerate thresholds that effectively ignore either class.
        if min(float(candidate["recall"]), float(candidate["specificity"])) < 0.10:
            continue
        score = (
            float(candidate["balanced_accuracy"]),
            float(candidate["f1"]),
            -abs(float(threshold) - 0.5),
        )
        threshold_candidates.append((score, float(threshold)))
    decision_threshold = max(threshold_candidates, key=lambda item: item[0])[1] if threshold_candidates else 0.5
    risk_metrics: dict[str, dict] = {}
    for split in ("train", "validation", "test"):
        frame = risk[risk.data_split == split]
        actual = frame["late_label"].to_numpy(dtype=int)
        probability = predict_probability(standardize_apply(frame, RISK_FEATURES, risk_mean, risk_scale), risk_weights)
        risk_metrics[split] = {
            **classification_metrics(actual, probability, decision_threshold),
            "rows": len(frame),
            "trips": int(frame["trip_id"].nunique()),
            "majority_baseline_accuracy": float(max(actual.mean(), 1 - actual.mean())),
            "majority_baseline_balanced_accuracy": 0.5,
        }

    serialize_model(
        output_dir / "eta_ridge_model.json",
        "ridge_regression",
        "actual_remaining_seconds",
        ETA_FEATURES,
        eta_mean,
        eta_scale,
        eta_weights,
    )
    serialize_model(
        output_dir / "late_logistic_model.json",
        "logistic_regression",
        "late_label",
        RISK_FEATURES,
        risk_mean,
        risk_scale,
        risk_weights,
        decision_threshold,
    )
    metrics = {
        "warning": "Metrics use LaDe proxy data and simulated schedules; they are not real-world CleanGo accuracy claims.",
        "eta": eta_metrics,
        "eta_training": {
            "selected_regularization": selected_regularization,
            "selection_rule": "Lowest validation MAE; test split was not used for tuning.",
            "trip_balanced_sample_weights": True,
        },
        "late_risk": risk_metrics,
        "late_risk_training": {
            "decision_threshold": decision_threshold,
            "selection_rule": "Highest validation balanced accuracy, then F1; test split was not used for tuning.",
            "one_pre_deadline_checkpoint_per_trip": True,
            "minimum_validation_recall_per_class": 0.10,
        },
    }
    with (output_dir / "metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
