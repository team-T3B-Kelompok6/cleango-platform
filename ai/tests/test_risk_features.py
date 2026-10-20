from __future__ import annotations

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from risk_features import RISK_FEATURES, build_risk_features


def input_snapshot() -> dict:
    return {
        "prediction_at": "2026-10-16T09:00:00+07:00",
        "eta_seconds": 900,
        "baseline_eta_seconds": 960,
        "seconds_to_schedule": 600,
        "elapsed_seconds": 300,
        "stopped_duration_seconds": 20,
        "remaining_distance_m": 4000,
        "initial_distance_m": 8000,
        "rolling_speed_mps": 5,
        "expected_route_speed_mps": 4,
        "location_age_seconds": 15,
        "has_departed": True,
    }


class RiskFeatureTests(unittest.TestCase):
    def test_builds_only_information_available_at_prediction_time(self) -> None:
        features = build_risk_features(input_snapshot())
        self.assertEqual(list(features), RISK_FEATURES)
        self.assertEqual(features["eta_model_lateness_seconds"], 300)
        self.assertEqual(features["predicted_lateness_seconds"], 360)
        self.assertEqual(features["distance_ratio"], 0.5)
        self.assertEqual(features["has_departed"], 1.0)
        self.assertTrue(all(math.isfinite(value) for value in features.values()))

    def test_rejects_prediction_after_schedule_for_ml(self) -> None:
        snapshot = input_snapshot()
        snapshot["seconds_to_schedule"] = 0
        with self.assertRaisesRegex(ValueError, "seconds_to_schedule"):
            build_risk_features(snapshot)

    def test_rejects_incomplete_input(self) -> None:
        snapshot = input_snapshot()
        del snapshot["location_age_seconds"]
        with self.assertRaisesRegex(ValueError, "location_age_seconds"):
            build_risk_features(snapshot)


if __name__ == "__main__":
    unittest.main()
