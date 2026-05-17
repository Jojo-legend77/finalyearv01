# Parent-School Platform (Web + AI)

A modular parent-school communication and student performance monitoring platform with:

- **Frontend**: React + Vite
- **Backend API**: Node.js + Express + Sequelize + PostgreSQL
- **AI Service**: Python + FastAPI + scikit-learn

The system is implemented in two stages:

1. Full working non-AI platform (auth, RBAC, dashboards, operations, notifications, reports)
2. AI add-on for at-risk prediction and summary insights

---

## Monorepo structure

```text
/backend      # REST API, RBAC, DB models, notifications, reports, AI proxy endpoints
/frontend     # Role-based UI (Parent, Teacher, Admin)
/ai-service   # ML model training/prediction/summary service
```

---

## 1) Backend setup

### Install

```bash
cd backend
npm install
```

### Environment

```bash
cp .env.example .env
```

Update `.env` values for PostgreSQL and JWT as needed.

### Database

Create database in PostgreSQL and run schema:

```bash
psql -U postgres -d parent_school_platform -f scripts/schema.sql
```

Render PostgreSQL connection strings use this format:

```text
postgresql://<user>:<password>@<host>:5432/<database>
```

If `DATABASE_URL` is set (for example by Render), the backend will use it automatically.

Optional seed:

```bash
npm run seed
```

### Run

```bash
npm run dev
```

Backend default URL: `http://localhost:4000`

Health check: `GET /api/health`

---

## 2) Frontend setup

### Install

```bash
cd frontend
npm install
```

### Environment

```bash
cp .env.example .env
```

Default API base URL is `http://localhost:4000/api`.

### Run

```bash
npm run dev
```

Frontend default URL: `http://localhost:5173`

---

## 3) AI service setup

### Install

```bash
cd ai-service
python3 -m pip install --user -r requirements.txt
```

### Run

```bash
python3 main.py
```

AI service default URL: `http://localhost:8001`

---

## Core features delivered

### Authentication & RBAC

- Register/Login with JWT
- Roles: `parent`, `teacher`, `admin`
- Route-level authorization middleware

### Entities and normalized schema

- Users
- Students
- ParentStudent (many-to-many)
- TeacherStudent (many-to-many)
- Grade levels
- Sections under each grade
- Course definitions and grade-course mappings
- Teacher assignments by course and section
- Attendance
- Grades
- BehaviorReports
- Notifications
- SystemSettings

Seeded demo logins:

- Admin: `admin@school.local` / `Admin123!`
- Director: `director@school.local` / `Director123!`
- Teacher: `teacher@school.local` / `Teacher123!`
- Parent: `parent@school.local` / `Parent123!`

Seeded school structure:

- Grades 1 to 4 only
- 4 sections per grade: A, B, C, D
- 20 students per section
- 20 teachers total, one teacher per subject per grade
- Parent-child linking is intentionally deferred and can be done later from admin

### Teacher workflows

- View assigned students
- Record attendance
- Record grades
- Record behavior reports

### Parent workflows

- View linked students
- View child progress details and summaries

### Admin workflows

- Manage users
- Manage students
- Assign parent/teacher relationships
- Manage system settings

### Reports

- Student report endpoint
- Class summary endpoint
- System summary endpoint
- My-summary endpoint (role-aware)

### Notifications (near real-time)

- In-app notifications table + APIs
- Generated when teacher records attendance/grades/behavior
- Frontend polls notifications periodically

### AI integration (after core system)

- FastAPI ML service:
  - `POST /train`
  - `POST /predict`
  - `POST /summary`
- Backend AI endpoints:
  - `GET /api/ai/risk-summary`
  - `POST /api/ai/train` (admin)
  - `GET /api/ai/summary`
- Predicts at-risk level from attendance, grade, and behavior features

---

## Notes

- Backend does not auto-sync schema by default (`DB_SYNC=false`) to protect production-like data.
- Use SQL schema/migrations first, then seed data.
- Recommended production hardening:
  - stronger password policy
  - refresh token flow
  - stricter CORS and secure cookies
  - audit logging
