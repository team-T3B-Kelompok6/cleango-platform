from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any

import joblib

from work_duration_features import WORK_DURATION_FEATURES, build_work_duration_features


class WorkDurationPredictor:
    def __init__(self, model_path: Path) -> None:
        artifact = joblib.load(model_path)
        required = {
            "pipeline",
            "features",
            "model_name",
            "model_version",
            "known_services",
            "ready_for_demo",
            "production_ready",
        }
        missing = required - artifact.keys()
        if missing:
            raise ValueError(
                f"Work-duration artifact is missing fields: {', '.join(sorted(missing))}"
            )
        if list(artifact["features"]) != WORK_DURATION_FEATURES:
            raise ValueError(
                "Work-duration artifact feature contract does not match inference code"
            )
        self._pipeline = artifact["pipeline"]
        self.feature_names = tuple(artifact["features"])
        self.known_services = set(artifact["known_services"])
        self.model_name = str(artifact["model_name"])
        self.model_version = str(artifact["model_version"])
        self.ready_for_demo = bool(artifact["ready_for_demo"])
        self.production_ready = bool(artifact["production_ready"])

    def predict(
        self, snapshot: dict[str, Any], allow_demo_model: bool = False
    ) -> dict[str, Any]:
        frame, started_at = build_work_duration_features(snapshot)
        service_type = str(frame.iloc[0]["service_type"])
        scheduled_minutes = float(frame.iloc[0]["scheduled_duration_minutes"])
        estimated_minutes = scheduled_minutes
        source = "sop_fallback"
        warning = "Synthetic model is disabled; using the configured service duration."

        known_service = service_type in self.known_services
        if allow_demo_model and self.ready_for_demo and known_service:
            raw_prediction = float(self._pipeline.predict(frame)[0])
            sop_minutes = float(frame.iloc[0]["sop_base_minutes"])
            lower_bound = max(5.0, min(sop_minutes, scheduled_minutes) * 0.5)
            upper_bound = max(sop_minutes, scheduled_minutes) * 2.5
            estimated_minutes = min(max(raw_prediction, lower_bound), upper_bound)
            source = "ml_demo"
            warning = (
                "Demo prediction trained on synthetic work-duration data; "
                "not validated for production."
            )
        elif not known_service:
            source = "sop_fallback_unknown_service"
            warning = "Service is not present in training data; using its configured duration."

        rounded_minutes = round(estimated_minutes, 1)
        return {
            "estimated_duration_minutes": rounded_minutes,
            "estimated_completed_at": (
                started_at + timedelta(minutes=rounded_minutes)
            ).isoformat(),
            "source": source,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "production_ready": self.production_ready,
            "warning": warning,
        }
