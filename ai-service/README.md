# AI Service (FastAPI)

This service provides:

- `/health` health check
- `/train` lightweight model fitting using student records
- `/predict` at-risk predictions and trend labels
- `/summary` simple AI-style natural language summary

## Run

```bash
pip3 install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Input record schema

Each record should include:

- `studentId` (int)
- `studentName` (str)
- `attendanceRate` (0..1)
- `avgGradePercent` (0..100)
- `behaviorRiskScore` (higher = riskier)
- optional counts (`attendanceCount`, `gradeCount`, `behaviorCount`)
