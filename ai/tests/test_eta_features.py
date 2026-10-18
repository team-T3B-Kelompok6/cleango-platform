from __future__ import annotations

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from eta_features import ETA_FEATURES, build_eta_features


class EtaFeatureTests(unittest.TestCase):
    def test_builds_the_training_contract(self) -> None:
        features = build_eta_features(
            {
                "prediction_at": "2026-10-16T09:00:00+07:00",
                "baseline_eta_seconds": 900,
                "elapsed_seconds": 300,
                "stopped_duration_seconds": 20,
                "remaining_distance_m": 4000,
                "initial_distance_m": 8000,
                "rolling_speed_mps": 5,
                "expected_route_speed_mps": 4,
            }
        )
        self.assertEqual(list(features), ETA_FEATURES)
        self.assertEqual(features["distance_ratio"], 0.5)
        self.assertEqual(features["rolling_speed_ratio"], 1.25)
        self.assertTrue(all(math.isfinite(value) for value in features.values()))

    def test_rejects_an_invalid_distance(self) -> None:
        with self.assertRaisesRegex(ValueError, "initial_distance_m"):
            build_eta_features(
                {
                    "prediction_at": "2026-10-16T09:00:00+07:00",
                    "baseline_eta_seconds": 900,
                    "elapsed_seconds": 300,
                    "stopped_duration_seconds": 20,
                    "remaining_distance_m": 4000,
                    "initial_distance_m": 0,
                    "rolling_speed_mps": 5,
                    "expected_route_speed_mps": 4,
                }
            )


if __name__ == "__main__":
    unittest.main()
