import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { AlertBanner } from "@/components/shared/AlertBanner";

const ReportsPage = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [report, setReport] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [schoolSummary, setSchoolSummary] = useState(null);
  const [className, setClassName] = useState("");
  const [classSummary, setClassSummary] = useState(null);
  const [error, setError] = useState("");

  const classOptions = useMemo(() => {
    const names = new Set();
    students.forEach((student) => {
      const name = student.className || student.sectionRecord?.gradeLevel?.name;
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [students]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        if (user?.role === "admin") {
          const res = await api.get("/admin/students");
          setStudents(res.data.data || []);
        } else if (user?.role === "teacher") {
          const res = await api.get("/teacher/students");
          setStudents(res.data.data || []);
        } else if (user?.role === "parent") {
          const res = await api.get("/parent/students");
          setStudents(res.data.data || []);
        }
      } catch {
        setStudents([]);
      }
    };
    if (["admin", "teacher", "parent"].includes(user?.role)) {
      loadStudents();
    }
  }, [user?.role]);

  const fetchStudentReport = async (event) => {
    event.preventDefault();
    setError("");
    setReport(null);

    const id = String(studentId).trim();
    if (!id) {
      setError("Enter or select a student before loading a report.");
      return;
    }

    try {
      const response = await api.get(`/reports/student/${encodeURIComponent(id)}`);
      setReport(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const fetchSystemSummary = async () => {
    setError("");
    try {
      const response = await api.get("/reports/summary/system");
      setSystemSummary(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const fetchSchoolSummary = async () => {
    setError("");
    try {
      const response = await api.get("/reports/summary/school");
      setSchoolSummary(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const fetchClassSummary = async (event) => {
    event.preventDefault();
    setError("");
    setClassSummary(null);

    const name = className.trim();
    if (!name) {
      setError("Enter or select a class name before loading a class summary.");
      return;
    }

    if (!["teacher", "admin"].includes(user?.role)) {
      setError("Only teachers and admins can load class summaries.");
      return;
    }

    try {
      const response = await api.get(`/reports/summary/class/${encodeURIComponent(name)}`);
      setClassSummary(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const canLoadClassSummary = ["teacher", "admin"].includes(user?.role);

  return (
    <Layout>
      <div className="stack">
        <h2 className="text-2xl font-semibold tracking-tight">Reports & Summaries</h2>
        <AlertBanner variant="error">{error}</AlertBanner>

        <div className="grid cols-2">
          <Card title="Student Report">
            <form onSubmit={fetchStudentReport} className="form">
              {students.length > 0 ? (
                <label>
                  Student
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                        {student.className ? ` (${student.className})` : ""} — ID {student.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Student ID
                  <input
                    placeholder="e.g. 1"
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    required
                  />
                </label>
              )}
              <button type="submit" className="btn primary">
                Load Student Report
              </button>
            </form>
            {report ? (
              <pre className="json">{JSON.stringify(report.summary, null, 2)}</pre>
            ) : null}
          </Card>

          {user?.role === "admin" ? (
            <Card title="System Summary (Admin)">
              <button type="button" className="btn secondary" onClick={fetchSystemSummary}>
                Load System Summary
              </button>
              {systemSummary ? <pre className="json">{JSON.stringify(systemSummary, null, 2)}</pre> : null}
            </Card>
          ) : null}

          {user?.role === "school_director" ? (
            <Card title="School Summary">
              <button type="button" className="btn secondary" onClick={fetchSchoolSummary}>
                Load School Summary
              </button>
              {schoolSummary ? <pre className="json">{JSON.stringify(schoolSummary.overall, null, 2)}</pre> : null}
            </Card>
          ) : null}

          {canLoadClassSummary ? (
            <Card title="Class Summary">
              <form onSubmit={fetchClassSummary} className="form">
                {classOptions.length > 0 ? (
                  <label>
                    Class
                    <select value={className} onChange={(e) => setClassName(e.target.value)} required>
                      <option value="">Select a class</option>
                      {classOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    Class name
                    <input
                      placeholder="e.g. Grade 4"
                      value={className}
                      onChange={(event) => setClassName(event.target.value)}
                      required
                    />
                  </label>
                )}
                <button type="submit" className="btn primary">
                  Load Class Summary
                </button>
              </form>
              {classSummary ? (
                <pre className="json">{JSON.stringify(classSummary.overall, null, 2)}</pre>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
