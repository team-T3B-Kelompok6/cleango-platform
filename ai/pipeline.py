from __future__ import annotations

import argparse
import bisect
import csv
import hashlib
import json
import math
import statistics
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable


REFERENCE_YEAR = 2000
CITY_ALIASES = {
    "chongqing": "重庆市",
    "重庆市": "重庆市",
}


@dataclass
class Trip:
    source_order_id: str
    source_courier_id: str
    source_day: str
    city: str
    accepted_at: datetime
    started_at: datetime
    completed_at: datetime
    destination_x: float
    destination_y: float
    trip_id: str
    courier_id: str


@dataclass
class GpsPoint:
    recorded_at: datetime
    x: float
    y: float


def anonymize(prefix: str, value: str) -> str:
    digest = hashlib.sha256(f"cleango-ai-00:{value}".encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


def normalize_day(value: str) -> str:
    digits = "".join(char for char in str(value) if char.isdigit())
    if len(digits) == 3:
        digits = f"0{digits}"
    if len(digits) != 4:
        raise ValueError(f"Invalid source day: {value!r}")
    return f"{digits[:2]}-{digits[2:]}"


def parse_source_time(value: str) -> datetime:
    return datetime.strptime(f"{REFERENCE_YEAR}-{value.strip()}", "%Y-%m-%d %H:%M:%S")


def iso(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def make_non_overlapping_trips(rows: list[dict[str, str]], city: str) -> list[Trip]:
    by_courier_day: dict[tuple[str, str], list[Trip]] = defaultdict(list)
    for row in rows:
        try:
            accepted_at = parse_source_time(row["receipt_time"])
            completed_at = parse_source_time(row["sign_time"])
            source_day = normalize_day(row["ds"])
            destination_x = float(row["poi_lng"])
            destination_y = float(row["poi_lat"])
        except (KeyError, TypeError, ValueError):
            continue
        if completed_at <= accepted_at or completed_at - accepted_at > timedelta(hours=12):
            continue
        source_order_id = row["order_id"].strip()
        source_courier_id = row["delivery_user_id"].strip()
        if not source_order_id or not source_courier_id:
            continue
        by_courier_day[(source_courier_id, source_day)].append(
            Trip(
                source_order_id=source_order_id,
                source_courier_id=source_courier_id,
                source_day=source_day,
                city=city,
                accepted_at=accepted_at,
                started_at=accepted_at,
                completed_at=completed_at,
                destination_x=destination_x,
                destination_y=destination_y,
                trip_id=anonymize("trip", source_order_id),
                courier_id=anonymize("courier", source_courier_id),
            )
        )

    result: list[Trip] = []
    for trips in by_courier_day.values():
        previous_completion: datetime | None = None
        for trip in sorted(trips, key=lambda item: item.completed_at):
            started_at = max(trip.accepted_at, previous_completion or trip.accepted_at)
            previous_completion = max(previous_completion or trip.completed_at, trip.completed_at)
            if started_at >= trip.completed_at:
                continue
            trip.started_at = started_at
            result.append(trip)
    return result


def read_city_orders(path: Path, city: str) -> tuple[list[Trip], int]:
    source_rows = 0
    matching_rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            source_rows += 1
            if row.get("from_city_name") == city:
                matching_rows.append(row)
    return make_non_overlapping_trips(matching_rows, city), source_rows


def trajectory_member(archive: zipfile.ZipFile) -> str:
    csv_members = [
        name
        for name in archive.namelist()
        if name.lower().endswith(".csv") and "__macosx/" not in name.lower() and not Path(name).name.startswith("._")
    ]
    if len(csv_members) != 1:
        raise ValueError(f"Expected one trajectory CSV in archive, found {len(csv_members)}")
    return csv_members[0]


def build_interval_index(trips: Iterable[Trip]) -> dict[tuple[str, str], tuple[list[datetime], list[Trip]]]:
    grouped: dict[tuple[str, str], list[Trip]] = defaultdict(list)
    for trip in trips:
        grouped[(trip.source_courier_id, trip.source_day)].append(trip)
    index: dict[tuple[str, str], tuple[list[datetime], list[Trip]]] = {}
    for key, items in grouped.items():
        ordered = sorted(items, key=lambda item: item.started_at)
        index[key] = ([item.started_at for item in ordered], ordered)
    return index


def matched_trip(
    index: dict[tuple[str, str], tuple[list[datetime], list[Trip]]],
    courier_id: str,
    recorded_at: datetime,
) -> Trip | None:
    key = (courier_id, recorded_at.strftime("%m-%d"))
    indexed = index.get(key)
    if indexed is None:
        return None
    starts, trips = indexed
    position = bisect.bisect_right(starts, recorded_at) - 1
    if position < 0:
        return None
    trip = trips[position]
    return trip if recorded_at <= trip.completed_at else None


def iterate_trajectory(path: Path):
    with zipfile.ZipFile(path) as archive:
        member = trajectory_member(archive)
        with archive.open(member) as binary:
            import io

            with io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as text:
                yield from csv.DictReader(text)


def count_points(path: Path, trips: list[Trip]) -> tuple[Counter[str], int]:
    index = build_interval_index(trips)
    counts: Counter[str] = Counter()
    source_rows = 0
    for row in iterate_trajectory(path):
        source_rows += 1
        try:
            recorded_at = parse_source_time(row["gps_time"])
        except (KeyError, ValueError):
            continue
        trip = matched_trip(index, row.get("postman_id", ""), recorded_at)
        if trip is not None:
            counts[trip.trip_id] += 1
    return counts, source_rows


def balanced_select(trips: list[Trip], size: int) -> list[Trip]:
    buckets: dict[str, list[Trip]] = defaultdict(list)
    for trip in trips:
        buckets[trip.source_day].append(trip)
    for day in buckets:
        buckets[day].sort(key=lambda trip: hashlib.sha256(trip.trip_id.encode()).hexdigest())
    positions = {day: 0 for day in buckets}
    selected: list[Trip] = []
    days = sorted(buckets)
    while len(selected) < size:
        added = False
        for day in days:
            position = positions[day]
            if position < len(buckets[day]):
                selected.append(buckets[day][position])
                positions[day] += 1
                added = True
                if len(selected) == size:
                    break
        if not added:
            break
    return selected


def collect_points(path: Path, trips: list[Trip]) -> dict[str, list[GpsPoint]]:
    index = build_interval_index(trips)
    points: dict[str, list[GpsPoint]] = defaultdict(list)
    for row in iterate_trajectory(path):
        try:
            recorded_at = parse_source_time(row["gps_time"])
            x = float(row["lng"])
            y = float(row["lat"])
        except (KeyError, TypeError, ValueError):
            continue
        if not math.isfinite(x) or not math.isfinite(y):
            continue
        trip = matched_trip(index, row.get("postman_id", ""), recorded_at)
        if trip is not None:
            points[trip.trip_id].append(GpsPoint(recorded_at, x, y))
    return points


def downsample(points: list[GpsPoint], minimum_gap_seconds: int = 20) -> list[GpsPoint]:
    result: list[GpsPoint] = []
    seen: set[datetime] = set()
    for point in sorted(points, key=lambda item: item.recorded_at):
        if point.recorded_at in seen:
            continue
        seen.add(point.recorded_at)
        if not result or (point.recorded_at - result[-1].recorded_at).total_seconds() >= minimum_gap_seconds:
            result.append(point)
    if points and result and result[-1].recorded_at != max(points, key=lambda item: item.recorded_at).recorded_at:
        last = max(points, key=lambda item: item.recorded_at)
        if last.recorded_at > result[-1].recorded_at:
            result.append(last)
    return result


def assign_time_splits(trips: list[Trip]) -> tuple[dict[str, str], dict[str, list[str]]]:
    days = sorted({trip.source_day for trip in trips})
    if len(days) < 3:
        raise ValueError("At least three source days are required for train/validation/test splits")
    train_end = max(1, int(len(days) * 0.70))
    validation_end = max(train_end + 1, int(len(days) * 0.85))
    validation_end = min(validation_end, len(days) - 1)
    day_split = {
        day: "train" if index < train_end else "validation" if index < validation_end else "test"
        for index, day in enumerate(days)
    }
    trip_split = {trip.trip_id: day_split[trip.source_day] for trip in trips}
    boundaries = {
        split: [day for day in days if day_split[day] == split]
        for split in ("train", "validation", "test")
    }
    return trip_split, boundaries


def euclidean(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.hypot(x2 - x1, y2 - y1)


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_datasets(
    trips: list[Trip],
    points_by_trip: dict[str, list[GpsPoint]],
    trip_split: dict[str, str],
    output_dir: Path,
    schedule_buffer: float,
    risk_checkpoint_seconds: int,
) -> tuple[list[dict], list[dict], list[dict], list[dict], float]:
    training_speeds: list[float] = []
    for trip in trips:
        points = points_by_trip[trip.trip_id]
        first = points[0]
        remaining = (trip.completed_at - first.recorded_at).total_seconds()
        distance = euclidean(first.x, first.y, trip.destination_x, trip.destination_y)
        if trip_split[trip.trip_id] == "train" and remaining > 0 and distance > 0:
            training_speeds.append(distance / remaining)
    if not training_speeds:
        raise ValueError("No valid training trips were available to calibrate the baseline ETA")
    reference_speed = statistics.median(training_speeds)

    trip_rows: list[dict] = []
    gps_rows: list[dict] = []
    eta_rows: list[dict] = []
    risk_rows: list[dict] = []
    for trip in trips:
        points = points_by_trip[trip.trip_id]
        first = points[0]
        initial_distance = euclidean(first.x, first.y, trip.destination_x, trip.destination_y)
        scheduled_at = first.recorded_at + timedelta(seconds=(initial_distance / reference_speed) * schedule_buffer)
        actual_delay_seconds = (trip.completed_at - scheduled_at).total_seconds()
        late_label = int(actual_delay_seconds > 0)
        risk_level = "low" if actual_delay_seconds <= 0 else "medium" if actual_delay_seconds <= 600 else "high"
        split = trip_split[trip.trip_id]
        trip_rows.append(
            {
                "trip_id": trip.trip_id,
                "courier_id": trip.courier_id,
                "city": "Chongqing",
                "source_day": trip.source_day,
                "accepted_at": iso(trip.accepted_at),
                "started_at": iso(trip.started_at),
                "completed_at": iso(trip.completed_at),
                "scheduled_at": iso(scheduled_at),
                "schedule_is_simulated": "true",
                "destination_x": round(trip.destination_x, 3),
                "destination_y": round(trip.destination_y, 3),
                "actual_duration_seconds": int((trip.completed_at - trip.started_at).total_seconds()),
                "actual_delay_seconds": round(actual_delay_seconds, 3),
                "late_label": late_label,
                "risk_level": risk_level,
                "data_split": split,
            }
        )

        speeds: list[float] = []
        stopped_duration = 0.0
        previous: GpsPoint | None = None
        risk_checkpoint_written = False
        for sequence, point in enumerate(points):
            if point.recorded_at > trip.completed_at:
                continue
            instant_speed = 0.0
            if previous is not None:
                delta_seconds = (point.recorded_at - previous.recorded_at).total_seconds()
                if delta_seconds > 0:
                    instant_speed = euclidean(previous.x, previous.y, point.x, point.y) / delta_seconds
                    if instant_speed <= reference_speed * 0.05:
                        stopped_duration += delta_seconds
            speeds.append(instant_speed)
            rolling_speed = statistics.fmean(speeds[-5:])
            remaining_distance = euclidean(point.x, point.y, trip.destination_x, trip.destination_y)
            baseline_eta = remaining_distance / reference_speed
            actual_remaining = max(0.0, (trip.completed_at - point.recorded_at).total_seconds())
            seconds_to_schedule = (scheduled_at - point.recorded_at).total_seconds()
            elapsed = max(0.0, (point.recorded_at - trip.started_at).total_seconds())
            distance_ratio = remaining_distance / initial_distance if initial_distance > 0 else 0.0
            rolling_speed_ratio = rolling_speed / reference_speed
            eta_elapsed_ratio = baseline_eta / max(1.0, baseline_eta + elapsed)
            eta_schedule_ratio = baseline_eta / max(1.0, seconds_to_schedule)
            predicted_lateness = baseline_eta - seconds_to_schedule
            hour_radians = 2 * math.pi * (point.recorded_at.hour + point.recorded_at.minute / 60) / 24
            common = {
                "trip_id": trip.trip_id,
                "prediction_at": iso(point.recorded_at),
                "remaining_distance_units": round(remaining_distance, 6),
                "baseline_eta_seconds": round(baseline_eta, 3),
                "instant_speed_units_per_second": round(instant_speed, 6),
                "rolling_speed_units_per_second": round(rolling_speed, 6),
                "elapsed_seconds": round(elapsed, 3),
                "stopped_duration_seconds": round(stopped_duration, 3),
                "location_age_seconds": 0,
                "hour": point.recorded_at.hour,
                "distance_ratio": round(distance_ratio, 6),
                "rolling_speed_ratio": round(rolling_speed_ratio, 6),
                "eta_elapsed_ratio": round(eta_elapsed_ratio, 6),
                "hour_sin": round(math.sin(hour_radians), 6),
                "hour_cos": round(math.cos(hour_radians), 6),
                "data_split": split,
            }
            gps_rows.append(
                {
                    "trip_id": trip.trip_id,
                    "courier_id": trip.courier_id,
                    "sequence": sequence,
                    "recorded_at": iso(point.recorded_at),
                    "position_x": round(point.x, 3),
                    "position_y": round(point.y, 3),
                    "data_split": split,
                }
            )
            eta_rows.append({**common, "actual_remaining_seconds": round(actual_remaining, 3)})
            # One pre-deadline prediction per trip prevents late snapshots from leaking
            # the answer into the classifier. The checkpoint is configurable.
            if (
                not risk_checkpoint_written
                and elapsed >= risk_checkpoint_seconds
                and seconds_to_schedule > 0
            ):
                risk_rows.append(
                    {
                        **common,
                        "seconds_to_schedule": round(seconds_to_schedule, 3),
                        "eta_schedule_ratio": round(eta_schedule_ratio, 6),
                        "predicted_lateness_seconds": round(predicted_lateness, 3),
                        "has_departed": 1,
                        "late_label": late_label,
                        "risk_level": risk_level,
                        "label_is_simulated": "true",
                    }
                )
                risk_checkpoint_written = True
            previous = point

    trip_fields = list(trip_rows[0])
    gps_fields = list(gps_rows[0])
    eta_fields = list(eta_rows[0])
    risk_fields = list(risk_rows[0])
    write_csv(output_dir / "trips.csv", trip_rows, trip_fields)
    write_csv(output_dir / "gps_points.csv", gps_rows, gps_fields)
    write_csv(output_dir / "eta_training.csv", eta_rows, eta_fields)
    write_csv(output_dir / "risk_training.csv", risk_rows, risk_fields)
    split_rows = [
        {"trip_id": trip.trip_id, "source_day": trip.source_day, "data_split": trip_split[trip.trip_id]}
        for trip in trips
    ]
    write_csv(output_dir / "splits.csv", split_rows, ["trip_id", "source_day", "data_split"])
    for split in ("train", "validation", "test"):
        write_csv(
            output_dir / split / "eta.csv",
            [row for row in eta_rows if row["data_split"] == split],
            eta_fields,
        )
        write_csv(
            output_dir / split / "risk.csv",
            [row for row in risk_rows if row["data_split"] == split],
            risk_fields,
        )
    return trip_rows, gps_rows, eta_rows, risk_rows, reference_speed


def validate(
    trips: list[dict],
    gps_rows: list[dict],
    eta_rows: list[dict],
    risk_rows: list[dict],
    expected_size: int,
) -> dict:
    split_ids: dict[str, set[str]] = defaultdict(set)
    point_counts: Counter[str] = Counter()
    for row in trips:
        split_ids[row["data_split"]].add(row["trip_id"])
    for row in gps_rows:
        point_counts[row["trip_id"]] += 1
    overlaps = {
        "train_validation": len(split_ids["train"] & split_ids["validation"]),
        "train_test": len(split_ids["train"] & split_ids["test"]),
        "validation_test": len(split_ids["validation"] & split_ids["test"]),
    }
    checks = {
        "selected_trip_count_matches_request": len(trips) == expected_size,
        "trip_ids_are_unique": len({row["trip_id"] for row in trips}) == len(trips),
        "minimum_five_gps_points_per_trip": min(point_counts.values(), default=0) >= 5,
        "eta_targets_are_non_negative": all(float(row["actual_remaining_seconds"]) >= 0 for row in eta_rows),
        "all_three_splits_are_present": set(split_ids) == {"train", "validation", "test"},
        "no_trip_leakage_between_splits": all(value == 0 for value in overlaps.values()),
        "risk_labels_include_both_classes": {int(row["late_label"]) for row in risk_rows} == {0, 1},
        "one_risk_checkpoint_per_trip": len({row["trip_id"] for row in risk_rows}) == len(risk_rows),
        "risk_checkpoints_are_before_schedule": all(float(row["seconds_to_schedule"]) > 0 for row in risk_rows),
        "risk_dataset_covers_most_trips": len(risk_rows) >= int(expected_size * 0.75),
    }
    return {"checks": checks, "split_overlap_trip_counts": overlaps, "passed": all(checks.values())}


def write_report(
    output_dir: Path,
    source_dir: Path,
    source_order_rows: int,
    source_trajectory_rows: int,
    candidate_count: int,
    eligible_count: int,
    trip_rows: list[dict],
    gps_rows: list[dict],
    eta_rows: list[dict],
    risk_rows: list[dict],
    reference_speed: float,
    boundaries: dict[str, list[str]],
    validation: dict,
    risk_checkpoint_seconds: int,
) -> None:
    report = {
        "card": "AI-00 — Perancangan Dataset dan Pipeline Machine Learning",
        "status": "pipeline_sample_complete" if validation["passed"] else "validation_failed",
        "city": {
            "name": "Chongqing",
            "source_value": "重庆市",
            "selection_reason": "Dense large city with complex and hilly road conditions; used only as an overseas proxy for Indonesian urban operations.",
        },
        "source": {
            "dataset": "Cainiao-AI LaDe",
            "license": "Apache-2.0",
            "orders": str(source_dir / "raw" / "orders" / "delivery_five_cities.csv"),
            "trajectory": str(source_dir / "raw" / "trajectory" / "courier_detailed_trajectory.zip"),
            "orders_scanned": source_order_rows,
            "trajectory_rows_scanned_per_pass": source_trajectory_rows,
        },
        "counts": {
            "candidate_non_overlapping_trips": candidate_count,
            "eligible_trips_with_gps": eligible_count,
            "selected_trips": len(trip_rows),
            "gps_points": len(gps_rows),
            "eta_training_rows": len(eta_rows),
            "risk_training_rows": len(risk_rows),
            "trips_by_split": dict(Counter(row["data_split"] for row in trip_rows)),
            "late_labels": dict(Counter(str(row["late_label"]) for row in trip_rows)),
            "risk_levels": dict(Counter(row["risk_level"] for row in trip_rows)),
        },
        "targets": {
            "eta_regression": "actual_remaining_seconds",
            "late_classification": "late_label",
            "risk_classification_optional": "risk_level",
        },
        "feature_contract": {
            "coordinate_system": "Raw LaDe transformed coordinates are retained for audit only; models use ratios and seconds.",
            "distance_ratio": "current remaining route distance / initial route distance",
            "rolling_speed_ratio": "current rolling speed / expected route speed",
            "live_requirement": "At inference, baseline_eta_seconds and ratios must come from one consistent routing snapshot.",
        },
        "risk_checkpoint": {
            "seconds_after_departure": risk_checkpoint_seconds,
            "rule": "At most one snapshot per trip, after the checkpoint and strictly before scheduled_at.",
        },
        "simulation": {
            "scheduled_at": True,
            "late_label": True,
            "method": "Scheduled completion is derived from straight-line distance, a training-only median speed, and a fixed buffer.",
            "claim_limit": "The result is suitable for learning/demo only and is not evidence of real-world CleanGo accuracy.",
        },
        "privacy": {
            "identifiers": "Re-hashed with a project-specific SHA-256 prefix.",
            "coordinates": "LaDe transformed coordinate system; no customer name, address, phone, or original identifier is exported.",
        },
        "split_strategy": {
            "type": "time-based by source day",
            "days": boundaries,
            "leakage_rule": "Every snapshot from one trip stays in exactly one split.",
        },
        "reference_speed_units_per_second": reference_speed,
        "missing_for_production": [
            "Real CleanGo scheduled_at and booking window",
            "WGS84 cleaner and destination coordinates with user consent",
            "Road-route remaining distance",
            "Baseline ETA from the selected Maps/routing API",
            "Traffic and weather context",
            "Cleaner transport mode",
            "Actual CleanGo trip outcomes and delay labels",
        ],
        "validation": validation,
    }
    with (output_dir / "validation_report.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the CleanGo AI-00 ETA and lateness sample from LaDe.")
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=Path(r"C:\coding\s3\PBL\datasets\CleanGo-LaDe"),
    )
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed/sample_v2"))
    parser.add_argument("--city", default="chongqing", choices=sorted(CITY_ALIASES))
    parser.add_argument("--sample-size", type=int, default=1000)
    parser.add_argument("--schedule-buffer", type=float, default=1.15)
    parser.add_argument("--risk-checkpoint-seconds", type=int, default=120)
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    orders_path = source_dir / "raw" / "orders" / "delivery_five_cities.csv"
    trajectory_path = source_dir / "raw" / "trajectory" / "courier_detailed_trajectory.zip"
    if not orders_path.is_file() or not trajectory_path.is_file():
        raise FileNotFoundError("CleanGo-LaDe raw orders or trajectory file is missing")
    if args.sample_size <= 0:
        raise ValueError("sample-size must be positive")
    if args.risk_checkpoint_seconds < 0:
        raise ValueError("risk-checkpoint-seconds must be non-negative")

    city = CITY_ALIASES[args.city]
    print("[1/6] Reading Chongqing orders...")
    candidates, source_order_rows = read_city_orders(orders_path, city)
    print(f"      {len(candidates):,} non-overlapping candidate trips")

    print("[2/6] First trajectory pass: counting usable GPS points...")
    point_counts, source_trajectory_rows = count_points(trajectory_path, candidates)
    eligible = [trip for trip in candidates if point_counts[trip.trip_id] >= 8]
    if len(eligible) < args.sample_size:
        raise ValueError(f"Only {len(eligible)} trips have enough GPS points; requested {args.sample_size}")
    preliminary = balanced_select(eligible, min(len(eligible), args.sample_size * 3))
    print(f"      {len(eligible):,} eligible; collecting {len(preliminary):,} preliminary trips")

    print("[3/6] Second trajectory pass: collecting selected GPS points...")
    raw_points = collect_points(trajectory_path, preliminary)
    processed_points = {trip_id: downsample(points) for trip_id, points in raw_points.items()}
    valid = [trip for trip in preliminary if len(processed_points.get(trip.trip_id, [])) >= 5]
    selected = balanced_select(valid, args.sample_size)
    if len(selected) < args.sample_size:
        raise ValueError(f"Only {len(selected)} trips remain after 20-second downsampling")
    selected_ids = {trip.trip_id for trip in selected}
    processed_points = {trip_id: points for trip_id, points in processed_points.items() if trip_id in selected_ids}

    print("[4/6] Assigning time-based train/validation/test splits...")
    trip_split, boundaries = assign_time_splits(selected)

    print("[5/6] Creating ETA and simulated lateness datasets...")
    output_dir.mkdir(parents=True, exist_ok=True)
    trip_rows, gps_rows, eta_rows, risk_rows, reference_speed = build_datasets(
        selected,
        processed_points,
        trip_split,
        output_dir,
        args.schedule_buffer,
        args.risk_checkpoint_seconds,
    )

    print("[6/6] Validating outputs and writing provenance report...")
    validation = validate(trip_rows, gps_rows, eta_rows, risk_rows, args.sample_size)
    write_report(
        output_dir,
        source_dir,
        source_order_rows,
        source_trajectory_rows,
        len(candidates),
        len(eligible),
        trip_rows,
        gps_rows,
        eta_rows,
        risk_rows,
        reference_speed,
        boundaries,
        validation,
        args.risk_checkpoint_seconds,
    )
    if not validation["passed"]:
        failed = [name for name, passed in validation["checks"].items() if not passed]
        raise RuntimeError(f"Output validation failed: {', '.join(failed)}")
    print(f"Done: {len(trip_rows):,} trips and {len(eta_rows):,} ETA snapshots written to {output_dir}")


if __name__ == "__main__":
    main()
