import { useEffect, useState } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import { PageHeader } from "../components/shared/PageHeader";
import { AlertBanner } from "../components/shared/AlertBanner";
import api from "../api/client";

export default function ParentDashboard() {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState("");
  const [details, setDetails] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const listRes = await api.get("/parent/students");
      setStudents(listRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    }
  };

  const loadStudent = async (studentId) => {
    if (!studentId) return;
    try {
      setError("");
      const [detailsRes, summaryRes] = await Promise.all([
        api.get(`/parent/students/${studentId}`),
        api.get(`/parent/students/${studentId}/summary`),
      ]);
      setDetails(detailsRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load student");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="stack">
        <div className="dashboard-hero">
          <div>
            <p className="section-label">Parent dashboard</p>
            <h1 className="hero-title">Messages from School</h1>
            <p className="hero-sub">Keep track of attendance, grades, and behavior updates for your children.</p>
          </div>
          <div className="dashboard-hero-stats">
            <div>
              <span>Children</span>
              <strong>{students.length}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{selected ? "Active" : "Select"}</strong>
            </div>
          </div>
        </div>

        <AlertBanner variant="error">{error}</AlertBanner>

        <div className="grid cols-2">
          <Card title="My Children">
            <select
              className="input"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                loadStudent(e.target.value);
              }}
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} ({student.className})
                </option>
              ))}
            </select>
          </Card>

          <Card title="Progress Summary">
            {summary ? (
              <div className="stats-grid">
                <div className="stat-box">
                  <span>Attendance Rate</span>
                  <strong>{summary.attendanceRate}%</strong>
                </div>
                <div className="stat-box">
                  <span>Average Grade</span>
                  <strong>{summary.averageGradePercent}%</strong>
                </div>
                <div className="stat-box">
                  <span>Behavior Reports</span>
                  <strong>{summary.behaviorReportsCount}</strong>
                </div>
              </div>
            ) : (
              <p>Select a child to view summary.</p>
            )}
          </Card>
        </div>

        {details && (
          <div className="grid cols-3">
            <Card title="Attendance">
              <ul className="list small">
                {details.records?.attendance?.map((item) => (
                  <li key={item.id}>
                    {item.date}: {item.status}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Grades">
              <ul className="list small">
                {details.records?.grades?.map((item) => (
                  <li key={item.id}>
                    {item.subject}: {item.score}/{item.maxScore}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Behavior Reports">
              <ul className="list small">
                {details.records?.behaviorReports?.map((item) => (
                  <li key={item.id}>
                    {item.incidentDate}: {item.category} ({item.severity})
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
