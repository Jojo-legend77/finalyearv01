#!/usr/bin/env python3
"""
train_from_csv.py

Helper to convert a weighted synthetic CSV into the AI service /train payload
and POST it to the local FastAPI AI service. If the AI server is not reachable
the script will save the prepared JSON payload to `train_payload.json`.

Usage:
  python train_from_csv.py --csv student_performance_weighted_synthetic.csv --url http://localhost:8001

The CSV is expected to contain columns created by the generator:
  student_id, term, attendance_rate, attendance_count, behavior_count,
  behavior_severity_score, quiz_score, mid_score, final_score,
  quiz_max, mid_max, final_max, previous_grade, current_grade, decline

This script converts each row into a record with the AI service schema:
  studentId, studentName, attendanceRate, avgGradePercent, behaviorRiskScore,
  attendanceCount, gradeCount, behaviorCount

Do not change API contracts: the script only formats and posts data.
"""

import argparse
import csv
import json
import os
import sys
from typing import List, Dict

try:
    import requests
except Exception:
    requests = None


def row_to_record(row: Dict[str, str]) -> Dict:
    # Convert numeric fields safely
    def f(key, cast=float, default=0.0):
        try:
            return cast(row.get(key, "") or default)
        except Exception:
            return default

    student_id = int(f("student_id", int, 0))
    student_name = f"Student {student_id}"

    attendance_rate = float(row.get("attendance_rate") or 0.0)

    # Compute average percent from weighted parts if present
    quiz = f("quiz_score", float, 0.0)
    mid = f("mid_score", float, 0.0)
    final = f("final_score", float, 0.0)
    quiz_max = f("quiz_max", float, 0.0)
    mid_max = f("mid_max", float, 0.0)
    final_max = f("final_max", float, 0.0)

    total_max = (quiz_max or 0) + (mid_max or 0) + (final_max or 0)
    if total_max > 0:
        # scale to 0..100
        avg_percent = (quiz + mid + final) / total_max * 100.0
    else:
        # fallback to current_grade if present
        avg_percent = f("current_grade", float, 0.0)

    behavior_score = f("behavior_severity_score", float, 0.0)
    attendance_count = int(f("attendance_count", int, 0))
    grade_count = 3 if (quiz_max or mid_max or final_max) else 0
    behavior_count = int(f("behavior_count", int, 0))

    return {
        "studentId": int(student_id),
        "studentName": student_name,
        "attendanceRate": round(float(attendance_rate), 4),
        "avgGradePercent": round(float(avg_percent), 4),
        "behaviorRiskScore": round(float(behavior_score), 4),
        "attendanceCount": attendance_count,
        "gradeCount": grade_count,
        "behaviorCount": behavior_count,
    }


def build_payload(csv_path: str) -> Dict:
    records: List[Dict] = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            records.append(row_to_record(row))

    return {"records": records}


def post_train(url: str, payload: Dict, dry_run: bool = False) -> None:
    train_url = url.rstrip("/") + "/train"
    if dry_run or requests is None:
        out = "train_payload.json"
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2)
        print(f"Dry run: payload written to {out} (records={len(payload.get('records', []))})")
        if requests is None:
            print("Note: 'requests' package not installed; to POST install requirements and rerun without --dry-run.")
        return

    print(f"Posting {len(payload.get('records', []))} records to {train_url} ...")
    resp = requests.post(train_url, json=payload, timeout=60)
    try:
        data = resp.json()
    except Exception:
        data = resp.text
    print("Response:", resp.status_code)
    print(json.dumps(data, indent=2) if isinstance(data, dict) else data)


def main(argv: List[str]):
    p = argparse.ArgumentParser(description="Train AI service from weighted CSV")
    p.add_argument("--csv", default="student_performance_weighted_synthetic.csv", help="CSV file path")
    p.add_argument("--url", default="http://localhost:8001", help="AI service base URL")
    p.add_argument("--dry-run", action="store_true", help="Do not POST, only save payload.json")
    args = p.parse_args(argv)

    if not os.path.exists(args.csv):
        print(f"CSV file not found: {args.csv}")
        sys.exit(2)

    payload = build_payload(args.csv)
    post_train(args.url, payload, dry_run=args.dry_run)


if __name__ == "__main__":
    main(sys.argv[1:])
