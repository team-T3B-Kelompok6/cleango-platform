import sys
import unittest
from datetime import datetime
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline import balanced_select, normalize_day, parse_source_time, trajectory_member, validate  # noqa: E402
from predict import build_live_features, predict_model  # noqa: E402


class PipelineTests(unittest.TestCase):
    def test_normalize_day(self):
        self.assertEqual(normalize_day("318"), "03-18")
        self.assertEqual(normalize_day("0318"), "03-18")

    def test_parse_source_time_uses_placeholder_year(self):
        value = parse_source_time("03-18 13:35:00")
        self.assertEqual(value, datetime(2000, 3, 18, 13, 35))

    def test_balanced_select_spreads_days(self):
        class Item:
            def __init__(self, day, trip_id):
                self.source_day = day
                self.trip_id = trip_id

        selected = balanced_select(
            [Item("03-18", "a"), Item("03-18", "b"), Item("03-19", "c"), Item("03-19", "d")],
            2,
        )
        self.assertEqual({item.source_day for item in selected}, {"03-18", "03-19"})

    def test_trajectory_member_ignores_macos_metadata(self):
        class Archive:
            @staticmethod
            def namelist():
                return ["trajectory.csv", "__MACOSX/._trajectory.csv"]

        self.assertEqual(trajectory_member(Archive()), "trajectory.csv")

    def test_live_features_use_unitless_ratios(self):
        features = build_live_features(
            {
                "prediction_at": "2026-10-15T08:10:00+07:00",
                "baseline_eta_seconds": 1200,
                "elapsed_seconds": 600,
                "stopped_duration_seconds": 30,
                "remaining_distance_m": 3000,
                "initial_distance_m": 6000,
                "rolling_speed_mps": 4,
                "expected_route_speed_mps": 5,
                "seconds_to_schedule": 1000,
            }
        )
        self.assertAlmostEqual(features["distance_ratio"], 0.5)
        self.assertAlmostEqual(features["rolling_speed_ratio"], 0.8)
        self.assertAlmostEqual(features["predicted_lateness_seconds"], 200)

    def test_prediction_rejects_missing_feature(self):
        model = {
            "model_type": "ridge_regression",
            "features": ["required"],
            "mean": [0],
            "scale": [1],
            "intercept": 0,
            "coefficients": [1],
        }
        with self.assertRaisesRegex(ValueError, "required"):
            predict_model(model, {})

    def test_prediction_applies_standardization(self):
        model = {
            "model_type": "ridge_regression",
            "features": ["value"],
            "mean": [10],
            "scale": [2],
            "intercept": 1,
            "coefficients": [3],
        }
        self.assertEqual(predict_model(model, {"value": 12}), 4)

    def test_validation_rejects_duplicate_risk_checkpoints(self):
        trips = [
            {"trip_id": "a", "data_split": "train"},
            {"trip_id": "b", "data_split": "validation"},
            {"trip_id": "c", "data_split": "test"},
            {"trip_id": "d", "data_split": "train"},
        ]
        gps = [
            {"trip_id": trip["trip_id"]}
            for trip in trips
            for _ in range(5)
        ]
        eta = [{"trip_id": trip["trip_id"], "actual_remaining_seconds": 1} for trip in trips]
        risk = [
            {"trip_id": "a", "late_label": 0, "seconds_to_schedule": 1},
            {"trip_id": "a", "late_label": 1, "seconds_to_schedule": 1},
            {"trip_id": "b", "late_label": 1, "seconds_to_schedule": 1},
        ]
        report = validate(trips, gps, eta, risk, expected_size=4)
        self.assertFalse(report["checks"]["one_risk_checkpoint_per_trip"])


if __name__ == "__main__":
    unittest.main()
