from pathlib import Path
import sys
import unittest


AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))

from work_duration_features import WORK_DURATION_FEATURES, build_work_duration_features
from work_duration_inference import WorkDurationPredictor


ARTIFACT = AI_ROOT / "artifacts" / "work_duration_v1" / "duration_pipeline.joblib"


def sample(service_type: str = "Deep Cleaning") -> dict[str, object]:
    return {
        "service_type": service_type,
        "district": "Lowokwaru",
        "size_unit": "m2",
        "area_m2": 60,
        "item_count": 0,
        "cleaner_count": 1,
        "condition_level": 2,
        "add_on_count": 1,
        "started_at": "2026-10-18T09:00:00+07:00",
        "sop_base_minutes": 150,
        "scheduled_duration_minutes": 180,
    }


class WorkDurationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.predictor = WorkDurationPredictor(ARTIFACT)

    def test_builds_time_features(self) -> None:
        frame, _ = build_work_duration_features(sample())
        self.assertEqual(frame.iloc[0]["start_hour"], 2)
        self.assertEqual(frame.iloc[0]["day_of_week"], 6)

    def test_equivalent_instants_use_the_same_model_time_features(self) -> None:
        local = sample()
        utc = sample()
        local["started_at"] = "2026-10-19T01:00:00+07:00"
        utc["started_at"] = "2026-10-18T18:00:00+00:00"

        local_frame, _ = build_work_duration_features(local)
        utc_frame, _ = build_work_duration_features(utc)

        self.assertEqual(local_frame.iloc[0]["start_hour"], 18)
        self.assertEqual(local_frame.iloc[0]["day_of_week"], 6)
        self.assertEqual(
            local_frame[["start_hour", "day_of_week"]].to_dict("records"),
            utc_frame[["start_hour", "day_of_week"]].to_dict("records"),
        )

    def test_artifact_uses_current_feature_contract(self) -> None:
        self.assertEqual(self.predictor.feature_names, tuple(WORK_DURATION_FEATURES))

    def test_demo_prediction_returns_finish_time(self) -> None:
        result = self.predictor.predict(sample(), allow_demo_model=True)
        self.assertEqual(result["source"], "ml_demo")
        self.assertGreater(result["estimated_duration_minutes"], 0)
        self.assertIn("+07:00", result["estimated_completed_at"])

    def test_unknown_service_uses_sop(self) -> None:
        data = sample("Cuci Motor")
        data["sop_base_minutes"] = 45
        data["scheduled_duration_minutes"] = 60
        result = self.predictor.predict(data, allow_demo_model=True)
        self.assertEqual(result["source"], "sop_fallback_unknown_service")
        self.assertEqual(result["estimated_duration_minutes"], 60)

    def test_rejects_invalid_cleaner_count(self) -> None:
        data = sample()
        data["cleaner_count"] = 0
        with self.assertRaises(ValueError):
            self.predictor.predict(data)


if __name__ == "__main__":
    unittest.main()
