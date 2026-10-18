from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from risk_features import RISK_FEATURES, build_risk_features


class RiskPredictor:
    def __init__(self, model_path: Path) -> None:
        artifact = joblib.load(model_path)
        required = {
            "pipeline",
            "features",
            "model_name",
            "model_version",
            "decision_threshold",
            "high_threshold",
        }
        missing = required - artifact.keys()
        if missing:
            raise ValueError(f"Risk artifact is missing fields: {', '.join(sorted(missing))}")
        if artifact["features"] != RISK_FEATURES:
            raise ValueError("Risk artifact feature contract does not match the inference service")
        self._pipeline = artifact["pipeline"]
        self.model_name = str(artifact["model_name"])
        self.model_version = str(artifact["model_version"])
        self.decision_threshold = float(artifact["decision_threshold"])
        self.high_threshold = float(artifact["high_threshold"])

    def predict(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        features = build_risk_features(snapshot)
        frame = pd.DataFrame([[features[name] for name in RISK_FEATURES]], columns=RISK_FEATURES)
        probability = float(self._pipeline.predict_proba(frame)[0, 1])
        risk_level = (
            "high"
            if probability >= self.high_threshold
            else "medium"
            if probability >= self.decision_threshold
            else "low"
        )
        return {
            "late_probability": round(probability, 4),
            "late_prediction": probability >= self.decision_threshold,
            "risk_level": risk_level,
            "predicted_lateness_seconds": round(
                features["eta_model_lateness_seconds"], 1
            ),
            "decision_threshold": round(self.decision_threshold, 4),
            "high_threshold": round(self.high_threshold, 4),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "predicted_at": datetime.now(timezone.utc).isoformat(),
            "warning": "Demo model using LaDe proxy data and simulated CleanGo schedules.",
        }
