import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import Layout from "../components/Layout";

const initialBehavior = {
  studentId: "",
  incidentDate: "",
  category: "",
  severity: "MEDIUM",
  description: "",
  actionTaken: "",
};

const attendanceStatuses = ["present", "late", "absent"];
const behaviorStatuses = ["active", "disturbing", "not active"];

const buildDefaultSelections = (students, defaultValue) =>
  students.reduce((accumulator, student) => {
    accumulator[student.id] = defaultValue;
    return accumulator;
  }, {});

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [attendanceByStudent, setAttendanceByStudent] = useState({});
  const [behaviorByStudent, setBehaviorByStudent] = useState({});
  const [bulkDate, setBulkDate] = useState("");
  const [behaviorForm, setBehaviorForm] = useState(initialBehavior);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const sectionOptions = useMemo(() => {
    const sections = new Map();
    students.forEach((student) => {
      const sectionId = student.sectionRecord?.id || student.sectionId || student.section;
      if (!sectionId) return;
      if (!sections.has(String(sectionId))) {
        sections.set(String(sectionId), {
          id: String(sectionId),
          label: `${student.sectionRecord?.gradeLevel?.name || student.className || "Grade"} ${student.sectionRecord?.name || student.section || ""}`.trim(),
        });
      }
    });
    return Array.from(sections.values());
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedSection) return [];
    return students.filter((student) => String(student.sectionRecord?.id || student.sectionId || student.section) === selectedSection);
  }, [selectedSection, students]);

  const studentOptions = useMemo(
    () => filteredStudents.map((student) => ({ id: student.id, label: `${student.firstName} ${student.lastName}` })),
    [filteredStudents],
  );

  const load = async () => {
    try {
      const studentsRes = await api.get("/teacher/students");
      setStudents(studentsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load teacher data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!sectionOptions.length) {
      setSelectedSection("");
      return;
    }

    if (!selectedSection || !sectionOptions.some((section) => section.id === selectedSection)) {
      setSelectedSection("");
    }
  }, [sectionOptions, selectedSection]);

  useEffect(() => {
    if (!filteredStudents.length) return;

    setAttendanceByStudent((previous) => {
      const nextSelections = { ...previous };
      filteredStudents.forEach((student) => {
        if (!nextSelections[student.id]) nextSelections[student.id] = "present";
      });
      return nextSelections;
    });

    setBehaviorByStudent((previous) => {
      const nextSelections = { ...previous };
      filteredStudents.forEach((student) => {
        if (!nextSelections[student.id]) nextSelections[student.id] = "active";
      });
      return nextSelections;
    });
  }, [filteredStudents]);

  const submitBulkRecords = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (!selectedSection) {
      setError("Please select a section first.");
      return;
    }

    if (!bulkDate) {
      setError("Please choose a date for the batch records.");
      return;
    }

    if (!filteredStudents.length) {
      setError("No students found in the selected section.");
      return;
    }

    try {
      await Promise.all(
        filteredStudents.flatMap((student) => {
          const attendanceStatus = attendanceByStudent[student.id] || "present";
          const behaviorStatus = behaviorByStudent[student.id] || "active";

          return [
            api.post("/teacher/attendance", {
              studentId: Number(student.id),
              date: bulkDate,
              status: attendanceStatus,
              note: `Bulk attendance recorded for ${bulkDate}`,
            }),
            api.post("/teacher/behavior", {
              studentId: Number(student.id),
              incidentDate: bulkDate,
              category:
                behaviorStatus === "disturbing"
                  ? "Disturbing"
                  : behaviorStatus === "not active"
                    ? "Not Active"
                    : "Active",
              severity:
                behaviorStatus === "disturbing"
                  ? "MEDIUM"
                  : behaviorStatus === "not active"
                    ? "LOW"
                    : "LOW",
              description:
                behaviorStatus === "disturbing"
                  ? "Student displayed disturbing behavior during the selected period."
                  : behaviorStatus === "not active"
                    ? "Student was not fully engaged during the selected period."
                    : "Student was active and engaged during the selected period.",
              actionTaken: "Bulk status saved from teacher dashboard.",
            }),
          ];
        }),
      );

      setFeedback("Attendance and behavior saved for the selected section.");
      setBulkDate("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save attendance and behavior records");
    }
  };

  const submitBehavior = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");
    if (!selectedSection) {
      setError("Please select a section first.");
      return;
    }
    try {
      await api.post("/teacher/behavior", {
        ...behaviorForm,
        studentId: Number(behaviorForm.studentId),
      });
      setFeedback("Behavior report recorded");
      setBehaviorForm(initialBehavior);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record behavior");
    }
  };

  return (
    <Layout>
      <div className="stack">
        {feedback && <div className="alert success">{feedback}</div>}
        {error && <div className="alert error">{error}</div>}

        <Card title="Section Snapshot">
          <div className="stats-grid">
            <div className="stat-box">
              <span>Total Assigned Students</span>
              <strong>{students.length}</strong>
            </div>
            <div className="stat-box">
              <span>Available Sections</span>
              <strong>{sectionOptions.length}</strong>
            </div>
            <div className="stat-box">
              <span>Selected Section Students</span>
              <strong>{filteredStudents.length}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <div className="teacher-overview">
            <div>
              <h1 className="hero-title">Daily Attendance &amp; Behavior</h1>
              <p className="hero-sub">Select a section first, then record attendance and behavior for only that class.</p>
            </div>
            <div className="teacher-kpi">
              Section Students
              <strong>{selectedSection ? filteredStudents.length : 0}</strong>
            </div>
          </div>
        </Card>

        <Card title="Attendance & Behavior">
          <div className="grid cols-3" style={{ marginBottom: "1rem" }}>
            <label>
              Section
              <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
                <option value="">Choose a section</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Record Date
              <input
                id="bulk-record-date"
                type="date"
                value={bulkDate}
                onChange={(event) => setBulkDate(event.target.value)}
              />
            </label>
            <div className="stack" style={{ alignSelf: "end" }}>
              <button type="button" className="btn primary" onClick={submitBulkRecords} disabled={!selectedSection || !filteredStudents.length}>
                Save Records
              </button>
            </div>
          </div>

          <div className="muted small" style={{ marginBottom: "0.8rem" }}>
            {selectedSection ? `Showing ${filteredStudents.length} students for the selected section.` : "Choose a section to load the students for attendance and behavior logging."}
          </div>

          <div className="attendance-table">
            <div className="attendance-row attendance-head">
              <div>Student</div>
              <div>Attendance</div>
              <div>Behavior</div>
            </div>
            {selectedSection ? (
              filteredStudents.length ? (
                filteredStudents.map((student) => {
                  const initials = `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase();
                  const attendanceSelection = attendanceByStudent[student.id] || "present";
                  const behaviorSelection = behaviorByStudent[student.id] || "active";

                  return (
                    <div key={student.id} className="attendance-row">
                      <div className="student-chip">
                        <div className="avatar-dot">{initials}</div>
                        <div>
                          <strong>
                            {student.firstName} {student.lastName}
                          </strong>
                          <div className="muted small">
                            {student.className}
                            {student.section ? ` ${student.section}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="pill-group">
                        {attendanceStatuses.map((status) => (
                          <button
                            key={`${student.id}-attendance-${status}`}
                            className={`pill ${attendanceSelection === status ? "active-primary" : ""}`}
                            type="button"
                            onClick={() =>
                              setAttendanceByStudent((previous) => ({
                                ...previous,
                                [student.id]: status,
                              }))
                            }
                          >
                            {status[0].toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="pill-group">
                        {behaviorStatuses.map((status) => (
                          <button
                            key={`${student.id}-behavior-${status}`}
                            className={`pill ${behaviorSelection === status ? "active-primary" : ""}`}
                            type="button"
                            onClick={() =>
                              setBehaviorByStudent((previous) => ({
                                ...previous,
                                [student.id]: status,
                              }))
                            }
                          >
                            {status === "not active" ? "Not Active" : status[0].toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="attendance-row">
                  <div className="muted">No students found in the selected section.</div>
                </div>
              )
            ) : (
              <div className="attendance-row">
                <div className="muted">Select a section to load the students for attendance and behavior logging.</div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid cols-1">
          <Card title="Record Behavior Report">
            <form onSubmit={submitBehavior} className="form stack">
              <label>
                Section
                <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)}>
                  <option value="">Choose a section</option>
                  {sectionOptions.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </label>
              <select
                required
                value={behaviorForm.studentId}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, studentId: e.target.value }))}
              >
                <option value="">Select student</option>
                {studentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                required
                type="date"
                value={behaviorForm.incidentDate}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, incidentDate: e.target.value }))}
              />
              <input
                required
                placeholder="Category"
                value={behaviorForm.category}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, category: e.target.value }))}
              />
              <select
                value={behaviorForm.severity}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, severity: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <textarea
                required
                placeholder="Description"
                value={behaviorForm.description}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <textarea
                placeholder="Action taken"
                value={behaviorForm.actionTaken}
                onChange={(e) => setBehaviorForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
              />
              <button type="submit">Save Behavior Report</button>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
