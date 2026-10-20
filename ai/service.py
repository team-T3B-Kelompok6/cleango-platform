from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request

from eta_inference import EtaPredictor
from risk_inference import RiskPredictor
from work_duration_inference import WorkDurationPredictor


def create_app(
    model_path: Path | None = None,
    risk_model_path: Path | None = None,
    work_duration_model_path: Path | None = None,
) -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
    path = model_path or Path(os.getenv("ETA_MODEL_PATH", "artifacts/eta_v1/eta_pipeline.joblib"))
    risk_path = risk_model_path or Path(
        os.getenv("RISK_MODEL_PATH", "artifacts/risk_v1/risk_pipeline.joblib")
    )
    work_duration_path = work_duration_model_path or Path(
        os.getenv(
            "WORK_DURATION_MODEL_PATH",
            "artifacts/work_duration_v1/duration_pipeline.joblib",
        )
    )
    allow_synthetic_work_duration = (
        os.getenv("ALLOW_SYNTHETIC_WORK_DURATION_MODEL", "false").lower() == "true"
    )
    eta_predictor: EtaPredictor | None = None
    risk_predictor: RiskPredictor | None = None
    work_duration_predictor: WorkDurationPredictor | None = None
    eta_load_error: str | None = None
    risk_load_error: str | None = None
    work_duration_load_error: str | None = None
    try:
        eta_predictor = EtaPredictor(path.resolve())
    except Exception as error:  # health remains available when deployment is incomplete
        eta_load_error = str(error)
    try:
        risk_predictor = RiskPredictor(risk_path.resolve())
    except Exception as error:  # health remains available when deployment is incomplete
        risk_load_error = str(error)
    try:
        work_duration_predictor = WorkDurationPredictor(work_duration_path.resolve())
    except Exception as error:  # health remains available when deployment is incomplete
        work_duration_load_error = str(error)

    def authorized() -> bool:
        expected = os.getenv("AI_SERVICE_TOKEN", "").strip()
        return not expected or request.headers.get("Authorization") == f"Bearer {expected}"

    @app.get("/health")
    def health():
        ready = (
            eta_predictor is not None
            and risk_predictor is not None
            and work_duration_predictor is not None
        )
        status = 200 if ready else 503
        return (
            jsonify(
                {
                    "status": "ready" if ready else "not_ready",
                    "models": {
                        "eta": {
                            "status": "ready" if eta_predictor else "not_ready",
                            "model_version": eta_predictor.model_version
                            if eta_predictor
                            else None,
                            "error": eta_load_error,
                        },
                        "risk": {
                            "status": "ready" if risk_predictor else "not_ready",
                            "model_version": risk_predictor.model_version
                            if risk_predictor
                            else None,
                            "error": risk_load_error,
                        },
                        "work_duration": {
                            "status": "ready"
                            if work_duration_predictor
                            else "not_ready",
                            "model_version": work_duration_predictor.model_version
                            if work_duration_predictor
                            else None,
                            "production_ready": work_duration_predictor.production_ready
                            if work_duration_predictor
                            else False,
                            "synthetic_model_enabled": allow_synthetic_work_duration,
                            "error": work_duration_load_error,
                        },
                    },
                }
            ),
            status,
        )

    @app.post("/predict/eta")
    def predict_eta():
        if not authorized():
            return jsonify({"message": "AI service token is invalid"}), 401
        if not eta_predictor:
            return jsonify({"message": "ETA model is not available", "detail": eta_load_error}), 503
        payload: Any = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"message": "Request body must be a JSON object"}), 400
        try:
            return jsonify({"data": eta_predictor.predict(payload)})
        except (TypeError, ValueError) as error:
            return jsonify({"message": str(error)}), 400

    @app.post("/predict/risk")
    def predict_risk():
        if not authorized():
            return jsonify({"message": "AI service token is invalid"}), 401
        if not risk_predictor:
            return jsonify(
                {"message": "Risk model is not available", "detail": risk_load_error}
            ), 503
        payload: Any = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"message": "Request body must be a JSON object"}), 400
        try:
            return jsonify({"data": risk_predictor.predict(payload)})
        except (TypeError, ValueError) as error:
            return jsonify({"message": str(error)}), 400

    @app.post("/predict/work-duration")
    def predict_work_duration():
        if not authorized():
            return jsonify({"message": "AI service token is invalid"}), 401
        if not work_duration_predictor:
            return jsonify(
                {
                    "message": "Work-duration model is not available",
                    "detail": work_duration_load_error,
                }
            ), 503
        payload: Any = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"message": "Request body must be a JSON object"}), 400
        try:
            return jsonify(
                {
                    "data": work_duration_predictor.predict(
                        payload,
                        allow_demo_model=allow_synthetic_work_duration,
                    )
                }
            )
        except (TypeError, ValueError) as error:
            return jsonify({"message": str(error)}), 400

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("AI_PORT", "5000")), debug=False)
