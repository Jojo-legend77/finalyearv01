from typing import Dict, List

from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestClassifier
import numpy as np


app = FastAPI(title="Parent-School AI Service", version="1.0.0")


class StudentRecord(BaseModel):
  studentId: int
  studentName: str
  attendanceRate: float = Field(ge=0, le=1)
  avgGradePercent: float = Field(ge=0, le=100)
  behaviorRiskScore: float = Field(ge=0)
  attendanceCount: int = Field(ge=0)
  gradeCount: int = Field(ge=0)
  behaviorCount: int = Field(ge=0)


class DatasetPayload(BaseModel):
  records: List[StudentRecord]


class ThresholdPayload(BaseModel):
  threshold: float = Field(ge=0, le=1)


state: Dict[str, object] = {
  "model": None,
  "threshold": 0.5,
}


def _features(records: List[StudentRecord]) -> np.ndarray:
  if not records:
    return np.empty((0, 4))
  return np.array(
    [
      [
        r.attendanceRate,
        r.avgGradePercent / 100.0,
        min(r.behaviorRiskScore / 3.0, 1.0),
        min((r.attendanceCount + r.gradeCount + r.behaviorCount) / 50.0, 1.0),
      ]
      for r in records
    ],
    dtype=float,
  )


def _heuristic_label(record: StudentRecord) -> int:
  risk_score = 0.0
  if record.attendanceRate < 0.85:
    risk_score += 0.4
  if record.avgGradePercent < 60:
    risk_score += 0.4
  if record.behaviorRiskScore >= 2.0:
    risk_score += 0.3
  return 1 if risk_score >= 0.5 else 0


@app.get("/health")
def health() -> Dict[str, str]:
  return {"status": "ok"}


@app.get("/threshold")
def get_threshold() -> Dict[str, float]:
  return {"threshold": float(state.get("threshold", 0.5))}


@app.post("/threshold")
def set_threshold(payload: ThresholdPayload) -> Dict[str, float]:
  state["threshold"] = float(payload.threshold)
  return {"threshold": float(state["threshold"])}


@app.post("/train")
def train(payload: DatasetPayload):
  records = payload.records
  if len(records) < 3:
    return {"trained": False, "message": "Need at least 3 records to train model"}

  x = _features(records)
  y = np.array([_heuristic_label(record) for record in records], dtype=int)

  if len(set(y.tolist())) == 1:
    y[0] = 1 - y[0]

  model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    class_weight="balanced",
  )
  model.fit(x, y)
  state["model"] = model
  return {"trained": True, "samples": len(records), "positive_labels": int(y.sum())}


@app.post("/predict")
def predict(payload: DatasetPayload):
  records = payload.records
  if not records:
    return {"records": [], "predictions": []}

  x = _features(records)
  model = state.get("model")

  if model is None:
    probs = []
    for record in records:
      base = 0.0
      base += max(0.0, 0.9 - record.attendanceRate) * 0.5
      base += max(0.0, 70 - record.avgGradePercent) / 100 * 0.35
      base += min(record.behaviorRiskScore / 3.0, 1.0) * 0.25
      probs.append(min(max(base, 0.0), 1.0))
  else:
    probs = model.predict_proba(x)[:, 1].tolist()

  predictions = []
  high_cutoff = float(state.get("threshold", 0.5))
  medium_cutoff = max(0.35, high_cutoff - 0.2)

  for record, probability in zip(records, probs):
    label = "HIGH_RISK" if probability >= high_cutoff else "MEDIUM_RISK" if probability >= medium_cutoff else "LOW_RISK"
    predictions.append(
      {
        "studentId": record.studentId,
        "studentName": record.studentName,
        "riskProbability": round(float(probability), 4),
        "riskLevel": label,
      }
    )

  return {"records": [r.model_dump() for r in records], "predictions": predictions}


@app.post("/summary")
def summary(payload: DatasetPayload):
  prediction_payload = predict(payload)
  predictions = prediction_payload.get("predictions", [])
  if not predictions:
    return {"summary": "No student records available for analysis."}

  high = [p for p in predictions if p["riskLevel"] == "HIGH_RISK"]
  medium = [p for p in predictions if p["riskLevel"] == "MEDIUM_RISK"]
  low = [p for p in predictions if p["riskLevel"] == "LOW_RISK"]

  summary_text = (
    f"AI analyzed {len(predictions)} students: "
    f"{len(high)} high-risk, {len(medium)} medium-risk, {len(low)} low-risk. "
  )
  if high:
    top = sorted(high, key=lambda x: x["riskProbability"], reverse=True)[:3]
    names = ", ".join(item["studentName"] for item in top)
    summary_text += f"Priority follow-up recommended for: {names}."
  else:
    summary_text += "No urgent high-risk cases detected currently."

  return {"summary": summary_text}
