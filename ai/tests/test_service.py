from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path


AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))

from service import create_app


class ServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.previous_token = os.environ.get("AI_SERVICE_TOKEN")
        os.environ["AI_SERVICE_TOKEN"] = "test-token"
        self.client = create_app().test_client()

    def tearDown(self) -> None:
        if self.previous_token is None:
            os.environ.pop("AI_SERVICE_TOKEN", None)
        else:
            os.environ["AI_SERVICE_TOKEN"] = self.previous_token

    def test_health_reports_loaded_models(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ready")

    def test_prediction_requires_internal_token(self) -> None:
        response = self.client.post("/predict/eta", json={})
        self.assertEqual(response.status_code, 401)

    def test_prediction_rejects_non_object_json(self) -> None:
        response = self.client.post(
            "/predict/eta",
            json=[],
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
