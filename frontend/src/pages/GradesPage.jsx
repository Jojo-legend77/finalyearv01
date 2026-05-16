import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import Layout from "../components/Layout";

const initialHeader = {
  date: "",
  type: "mid",
  weight: "mid",
};

const gradeTypeOptions = [
  { value: "mid", label: "Mid" },
  { value: "quiz", label: "Quiz" },
  { value: "final", label: "Final" },
];

const gradeWeightOptions = [
  { value: "mid", label: "Mid" },
  { value: "quiz", label: "Quiz" },
  { value: "final", label: "Final" },
];

const buildScoreMap = (students) =>
  students.reduce((accumulator, student) => {
    accumulator[student.id] = "";
    return accumulator;
  }, {});

export default function GradesPage() {
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [header, setHeader] = useState(initialHeader);
  const [scoresByStudent, setScoresByStudent] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

  const loadStudents = async () => {
    try {
      const response = await api.get("/teacher/students");
      const nextStudents = response.data.data || [];
      setStudents(nextStudents);
      setScoresByStudent((previous) => {
        const nextScores = { ...previous };
        nextStudents.forEach((student) => {
          if (nextScores[student.id] === undefined) {
            nextScores[student.id] = "";
          }
        });
        return nextScores;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load grade sheet.");
    }
  };

  useEffect(() => {
    loadStudents();
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
    setScoresByStudent((previous) => {
      const nextScores = { ...previous };
      filteredStudents.forEach((student) => {
        if (nextScores[student.id] === undefined) {
          nextScores[student.id] = "";
        }
      });
      return nextScores;
    });
  }, [filteredStudents]);

  const submitGrades = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (!selectedSection) {
      setError("Please select a section first.");
      return;
    }

    if (!header.date) {
      setError("Please choose a date before saving grades.");
      return;
    }

    if (!filteredStudents.length) {
      setError("No students found in the selected section.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        filteredStudents.map((student) => {
          const score = scoresByStudent[student.id];
          if (score === "" || score == null) {
            throw new Error(`Enter a score for ${student.firstName} ${student.lastName}.`);
          }

          return api.post("/teacher/grades", {
            studentId: Number(student.id),
            subject: "General",
            assessmentType: header.type,
            score: Number(score),
            maxScore: 100,
            examDate: header.date,
            term: header.weight,
            note: `Bulk ${header.type} grade saved from grade sheet`,
          });
        }),
      );

      setFeedback("Grades saved for the selected section.");
      setHeader(initialHeader);
      setScoresByStudent((previous) => {
        const nextScores = { ...previous };
        filteredStudents.forEach((student) => {
          nextScores[student.id] = "";
        });
        return nextScores;
      });
      await loadStudents();
    } catch (err) {
      setError(err.message || err.response?.data?.message || "Failed to save grades.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="stack">
        {feedback ? <div className="alert success">{feedback}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <Card title="Grade Snapshot">
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

        <Card title="Grade Sheet">
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
              Date
              <input
                type="date"
                value={header.date}
                onChange={(event) => setHeader((previous) => ({ ...previous, date: event.target.value }))}
              />
            </label>
            <div className="stack" style={{ alignSelf: "end" }}>
              <button type="button" className="btn primary" onClick={submitGrades} disabled={saving || !selectedSection || !filteredStudents.length}>
                {saving ? "Saving..." : "Save Grades"}
              </button>
            </div>
          </div>

          <div className="grid cols-3" style={{ marginBottom: "1rem" }}>
            <label>
              Type
              <select
                value={header.type}
                onChange={(event) => setHeader((previous) => ({ ...previous, type: event.target.value }))}
              >
                {gradeTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Weight
              <select
                value={header.weight}
                onChange={(event) => setHeader((previous) => ({ ...previous, weight: event.target.value }))}
              >
                {gradeWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="muted small" style={{ alignSelf: "end" }}>
              {selectedSection ? `Showing ${filteredStudents.length} students for the selected section.` : "Choose a section to load its students."}
            </div>
          </div>

          <div className="attendance-table">
            <div className="attendance-row attendance-head" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr" }}>
              <div>Student</div>
              <div>Date</div>
              <div>Type</div>
              <div>Weight</div>
              <div>Score</div>
            </div>

            {selectedSection ? (
              filteredStudents.length ? (
                filteredStudents.map((student) => {
                  const initials = `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase();
                  return (
                    <div key={student.id} className="attendance-row" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.9fr" }}>
                      <div className="student-chip">
                        <div className="avatar-dot">{initials}</div>
                        <div>
                          <strong>{student.firstName} {student.lastName}</strong>
                          <div className="muted small">Enter the score for this assessment</div>
                        </div>
                      </div>
                      <div className="muted small">{header.date || "Pick a date"}</div>
                      <div className="muted small">{gradeTypeOptions.find((option) => option.value === header.type)?.label}</div>
                      <div className="muted small">{gradeWeightOptions.find((option) => option.value === header.weight)?.label}</div>
                      <div>
                        <input
                          type="number"
                          placeholder="Score"
                          value={scoresByStudent[student.id] || ""}
                          onChange={(event) =>
                            setScoresByStudent((previous) => ({
                              ...previous,
                              [student.id]: event.target.value,
                            }))
                          }
                        />
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
                <div className="muted">Select a section to load the students for grading.</div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
