import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Card from "../components/Card";
import Layout from "../components/Layout";

export default function SchoolDirectorDashboard() {
  const [schoolReport, setSchoolReport] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ audience: "all", title: "", message: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const load = async () => {
    try {
      setError("");
      const res = await api.get("/reports/summary/school");
      setSchoolReport(res.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load school report.");
    }
  };

  const submitAnnouncement = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      const response = await api.post("/notifications/announcements", announcementForm);
      setStatus(response.data.message || "Announcement sent.");
      setAnnouncementForm({ audience: "all", title: "", message: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send announcement.");
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
            <p className="section-label">School director</p>
            <h1>School Director Dashboard</h1>
            <p className="hero-sub">
              Track school-wide performance, publish announcements, and open detailed reports only when needed.
            </p>
          </div>
          <div className="dashboard-hero-stats">
            <div>
              <span>Students</span>
              <strong>{schoolReport?.students?.length || 0}</strong>
            </div>
            <div>
              <span>Avg Attendance</span>
              <strong>{schoolReport?.overall?.averageAttendance ?? 0}%</strong>
            </div>
            <div>
              <span>Avg Grade</span>
              <strong>{schoolReport?.overall?.averageGrade ?? 0}%</strong>
            </div>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        {status && <div className="alert success">{status}</div>}

        <div className="grid cols-2">
          <Card title="Announcement Center">
            <form className="form" onSubmit={submitAnnouncement}>
              <label>
                Audience
                <select
                  value={announcementForm.audience}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, audience: event.target.value }))}
                >
                  <option value="all">Teachers and Parents</option>
                  <option value="teacher">Teachers only</option>
                  <option value="parent">Parents only</option>
                </select>
              </label>
              <label>
                Title
                <input
                  value={announcementForm.title}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="School closure reminder"
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  rows="5"
                  value={announcementForm.message}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Write the announcement for the selected audience"
                  required
                />
              </label>
              <button type="submit">Send Announcement</button>
            </form>
          </Card>

          <Card title="Quick Actions">
            <div className="stack">
              <p className="muted">
                Use the sidebar for live notifications and reports. This dashboard stays focused on school-wide status.
              </p>
              <div className="row">
                <Link className="btn secondary" to="/notifications">
                  Open Notifications
                </Link>
                <Link className="btn ghost" to="/reports">
                  Open Reports
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <Card
          title="School Performance Summary"
          actions={
            <button className="btn ghost" type="button" onClick={() => setShowDetails((current) => !current)}>
              {showDetails ? "Hide Details" : "Show Details"}
            </button>
          }
        >
          <div className="stats-grid">
            <div className="stat-box">
              <span>Students</span>
              <strong>{schoolReport?.students?.length || 0}</strong>
            </div>
            <div className="stat-box">
              <span>Average Attendance</span>
              <strong>{schoolReport?.overall?.averageAttendance ?? 0}%</strong>
            </div>
            <div className="stat-box">
              <span>Average Grade</span>
              <strong>{schoolReport?.overall?.averageGrade ?? 0}%</strong>
            </div>
          </div>
          {showDetails && schoolReport ? (
            <div className="table-wrapper" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Attendance Rate</th>
                    <th>Average Grade</th>
                    <th>Behavior Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolReport.students.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.studentName}</td>
                      <td>{student.className}</td>
                      <td>{student.attendanceRate}%</td>
                      <td>{student.averageGradePercent}%</td>
                      <td>{student.behaviorReportsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Student-level details stay hidden until you open them.</p>
          )}
        </Card>
      </div>
    </Layout>
  );
}