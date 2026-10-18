from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from eta_features import ETA_FEATURES, build_eta_features


class EtaPredictor:
    def __init__(self, model_path: Path) -> None:
        artifact = joblib.load(model_path)
        required = {"pipeline", "features", "model_name", "model_version", "model_better_than_baseline"}
        missing = required - artifact.keys()
        if missing:
            raise ValueError(f"ETA artifact is missing fields: {', '.join(sorted(missing))}")
        if artifact["features"] != ETA_FEATURES:
            raise ValueError("ETA artifact feature contract does not match the inference service")
        self._pipeline = artifact["pipeline"]
        self.model_name = str(artifact["model_name"])
        self.model_version = str(artifact["model_version"])
        self.model_better_than_baseline = bool(artifact["model_better_than_baseline"])

    def predict(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        features = build_eta_features(snapshot)
        frame = pd.DataFrame([[features[name] for name in ETA_FEATURES]], columns=ETA_FEATURES)
        eta_seconds = max(0.0, float(np.asarray(self._pipeline.predict(frame))[0]))
        return {
            "eta_seconds": round(eta_seconds, 1),
            "eta_minutes": max(1, round(eta_seconds / 60)),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "model_better_than_baseline": self.model_better_than_baseline,
            "predicted_at": datetime.now(timezone.utc).isoformat(),
            "warning": "Demo model using LaDe proxy data and simulated schedules.",
        }
