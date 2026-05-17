import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import Layout from "../components/Layout";
import { exportStudentsAsDocx, exportStudentsAsPdf } from "../utils/studentExports";

const emptyUser = { fullName: "", email: "", password: "", role: "parent", studentIds: [] };
const emptyChild = { firstName: "", lastName: "", sectionId: "", dateOfBirth: "" };
const emptyStudent = { firstName: "", lastName: "", sectionId: "", dateOfBirth: "" };
const emptyGrade = { name: "", sortOrder: 0 };
const emptySection = { gradeLevelId: "", name: "", code: "" };
const emptyCourse = { name: "", code: "" };
const emptyGradeCourse = { gradeLevelId: "", courseId: "" };
const emptyTeacherAssignment = { teacherId: "", courseId: "", sectionId: "" };
const defaultRiskThreshold = "0.50";

const parseAiSetting = (settingsList, key) => settingsList.find((item) => item.key === key)?.value || "";

const parseTrainingCsvMeta = (settingsList) => {
  const rawValue = parseAiSetting(settingsList, "ai_training_csv");
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const adminPanels = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "structure", label: "School Structure" },
  { key: "assignments", label: "Teacher Assignments" },
  { key: "ai", label: "AI Controls" },
  { key: "settings", label: "Settings" },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState([]);
  const [systemSummary, setSystemSummary] = useState(null);
  const [structure, setStructure] = useState({ grades: [], sections: [], courses: [], gradeCourses: [], teacherAssignments: [] });
  const [activePanel, setActivePanel] = useState("overview");
  const [visibleLists, setVisibleLists] = useState({
    users: false,
    students: false,
    grades: false,
    sections: false,
    courses: false,
    gradeCourses: false,
    teacherAssignments: false,
    settings: false,
  });
  const [userForm, setUserForm] = useState(emptyUser);
  const [childForm, setChildForm] = useState(emptyChild);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [gradeForm, setGradeForm] = useState(emptyGrade);
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [gradeCourseForm, setGradeCourseForm] = useState(emptyGradeCourse);
  const [teacherAssignmentForm, setTeacherAssignmentForm] = useState(emptyTeacherAssignment);
  const [settingForm, setSettingForm] = useState({ key: "", value: "" });
  const [riskThreshold, setRiskThreshold] = useState(defaultRiskThreshold);
  const [trainingCsvMeta, setTrainingCsvMeta] = useState(null);
  const [trainingCsvFile, setTrainingCsvFile] = useState(null);
  const [showTrainingData, setShowTrainingData] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGradeFilter, setStudentGradeFilter] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const teachers = useMemo(() => users.filter((user) => user.role === "teacher"), [users]);
  const gradeOptions = useMemo(() => structure.grades || [], [structure.grades]);
  const filteredStudents = useMemo(() => {
    const searchValue = studentSearch.trim().toLowerCase();

    return students.filter((student) => {
      const gradeName = student.sectionRecord?.gradeLevel?.name || student.className || "";
      const matchesGrade = !studentGradeFilter || gradeName === studentGradeFilter;
      const matchesSearch =
        !searchValue ||
        [student.firstName, student.lastName, student.registrationNumber, gradeName, student.sectionRecord?.name, student.section]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchValue));

      return matchesGrade && matchesSearch;
    });
  }, [students, studentGradeFilter, studentSearch]);

  const linkableStudents = useMemo(
    () => filteredStudents.filter((student) => !(student.parents?.length > 0)),
    [filteredStudents],
  );

  const toggleList = (key) => {
    setVisibleLists((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const load = async () => {
    try {
      setError("");
      const [usersRes, studentsRes, settingsRes, summaryRes, structureRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/students"),
        api.get("/admin/settings"),
        api.get("/reports/summary/system"),
        api.get("/admin/structure"),
      ]);
      setUsers(usersRes.data.data || []);
      setStudents(studentsRes.data.data || []);
      setSettings(settingsRes.data.data || []);
      setSystemSummary(summaryRes.data.data || null);
      setStructure(structureRes.data.data || { grades: [], sections: [], courses: [], gradeCourses: [], teacherAssignments: [] });
      const settingsList = settingsRes.data.data || [];
      setRiskThreshold(parseAiSetting(settingsList, "ai_risk_threshold") || defaultRiskThreshold);
      setTrainingCsvMeta(parseTrainingCsvMeta(settingsList));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin data.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitJson = async (endpoint, payload, successMessage) => {
    setStatus("");
    setError("");
    try {
      await api.post(endpoint, payload);
      setStatus(successMessage);
      load();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Request failed.");
      return false;
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const payload = {
      ...userForm,
      studentIds: userForm.role === "parent" ? userForm.studentIds : [],
      newStudent: userForm.role === "parent" && childForm.firstName ? childForm : null,
    };
    const ok = await submitJson("/admin/users", payload, "User created.");
    if (ok) {
      setUserForm(emptyUser);
      setChildForm(emptyChild);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/students", studentForm, "Student created.");
    if (ok) setStudentForm(emptyStudent);
  };

  const handleSaveSetting = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/settings", settingForm, "Setting saved.");
    if (ok) setSettingForm({ key: "", value: "" });
  };

  const handleCreateGrade = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/grades", gradeForm, "Grade created.");
    if (ok) setGradeForm(emptyGrade);
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/sections", sectionForm, "Section created.");
    if (ok) setSectionForm(emptySection);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/courses", courseForm, "Course created.");
    if (ok) setCourseForm(emptyCourse);
  };

  const handleAssignCourse = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/grades/courses", gradeCourseForm, "Course assigned to grade.");
    if (ok) setGradeCourseForm(emptyGradeCourse);
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/teacher-assignments", teacherAssignmentForm, "Teacher assigned to section and course.");
    if (ok) setTeacherAssignmentForm(emptyTeacherAssignment);
  };

  const handleUpdateRiskThreshold = async (e) => {
    e.preventDefault();
    const ok = await submitJson("/admin/ai/risk-threshold", { threshold: Number(riskThreshold) }, "Risk threshold updated.");
    if (ok) {
      load();
    }
  };

  const handleUploadTrainingCsv = async (e) => {
    e.preventDefault();
    if (!trainingCsvFile) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    setStatus("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", trainingCsvFile);
      await api.post("/admin/ai/training-csv", formData);
      setStatus("Training CSV uploaded.");
      setTrainingCsvFile(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload CSV.");
    }
  };

  const handleTriggerTraining = async () => {
    setStatus("");
    setError("");

    try {
      const response = await api.post("/admin/ai/train");
      const trainedRows = response.data?.data?.records ?? response.data?.data?.samples ?? 0;
      setStatus(`Training completed using ${trainedRows} rows.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to trigger training.");
    }
  };

  const gradeLabel = (gradeLevelId) => structure.grades.find((grade) => Number(grade.id) === Number(gradeLevelId))?.name || "";
  const sectionLabel = (sectionId) => {
    const section = structure.sections.find((item) => Number(item.id) === Number(sectionId));
    if (!section) return "";
    return `${section.gradeLevel?.name || ""} - ${section.name}`;
  };

  const handleExportStudentsPdf = () => {
    exportStudentsAsPdf(filteredStudents);
  };

  const handleExportStudentsDocx = () => {
    exportStudentsAsDocx(filteredStudents);
  };

  return (
    <Layout>
      <div className="admin-workbench">
        <aside className="admin-sidebar-panel">
          <p className="section-label">Admin console</p>
          <h2>Sections</h2>
          <div className="admin-nav">
            {adminPanels.map((panel) => (
              <button
                key={panel.key}
                type="button"
                className={activePanel === panel.key ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => setActivePanel(panel.key)}
              >
                {panel.label}
              </button>
            ))}
          </div>
          <div className="admin-sidebar-note">
            View one area at a time to keep the dashboard clean and professional.
          </div>
        </aside>

        <main className="admin-main stack">
          {error ? <div className="alert error">{error}</div> : null}
          {status ? <div className="alert success">{status}</div> : null}

          {activePanel === "overview" ? (
            <>
              <div className="dashboard-hero">
                <div>
                  <p className="section-label">Admin dashboard</p>
                  <h1 className="hero-title">School structure and management</h1>
                  <p className="hero-sub">
                    Define grades, sections, courses, and teacher assignments for real-world scheduling.
                  </p>
                </div>
                <div className="dashboard-hero-stats">
                  <div>
                    <span>Total Users</span>
                    <strong>{systemSummary?.users ?? 0}</strong>
                  </div>
                  <div>
                    <span>Total Students</span>
                    <strong>{systemSummary?.students ?? 0}</strong>
                  </div>
                </div>
              </div>

              <Card title="Platform Metrics">
                {!systemSummary ? (
                  <p className="muted">Loading summary...</p>
                ) : (
                  <div className="stats-grid">
                    <div className="stat-box"><span>Total Users</span><strong>{systemSummary.users}</strong></div>
                    <div className="stat-box"><span>Total Students</span><strong>{systemSummary.students}</strong></div>
                    <div className="stat-box"><span>Attendance Entries</span><strong>{systemSummary.records?.attendance}</strong></div>
                    <div className="stat-box"><span>Grades</span><strong>{systemSummary.records?.grades}</strong></div>
                    <div className="stat-box"><span>Behavior Reports</span><strong>{systemSummary.records?.behaviorReports}</strong></div>
                    <div className="stat-box"><span>Unread Notifications</span><strong>{systemSummary.records?.notifications}</strong></div>
                  </div>
                )}
              </Card>

              <div className="grid cols-2">
                <Card title="People">
                  <p className="muted">Create and manage users or students when you need to.</p>
                  <div className="row">
                    <button type="button" className="btn secondary" onClick={() => setActivePanel("people")}>Open People</button>
                    <button type="button" className="btn ghost" onClick={() => toggleList("users")}>Quick Users List</button>
                  </div>
                </Card>
                <Card title="School Structure">
                  <p className="muted">Grades, sections, and courses stay in their own area.</p>
                  <div className="row">
                    <button type="button" className="btn secondary" onClick={() => setActivePanel("structure")}>Open Structure</button>
                    <button type="button" className="btn ghost" onClick={() => toggleList("grades")}>Quick Grades List</button>
                  </div>
                </Card>
              </div>
            </>
          ) : null}

          {activePanel === "people" ? (
            <div className="stack">
              <Card title="Student Finder & Export">
                <div className="grid cols-3">
                  <label>
                    Search Students
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name or registration"
                    />
                  </label>
                  <label>
                    Grade Filter
                    <select value={studentGradeFilter} onChange={(e) => setStudentGradeFilter(e.target.value)}>
                      <option value="">All Grades</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade.id} value={grade.name}>
                          {grade.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="stack">
                    <span className="muted small">Matching students</span>
                    <strong>{filteredStudents.length}</strong>
                  </div>
                </div>
                <div className="row">
                  <button type="button" className="btn secondary" onClick={handleExportStudentsPdf} disabled={!filteredStudents.length}>
                    Export PDF
                  </button>
                  <button type="button" className="btn secondary" onClick={handleExportStudentsDocx} disabled={!filteredStudents.length}>
                    Export DOCX
                  </button>
                </div>
                <p className="muted small">These filters also narrow the child selection list below.</p>
              </Card>

              <div className="grid cols-2">
              <Card title="Create User" actions={<button type="button" className="btn ghost" onClick={() => toggleList("users")}>{visibleLists.users ? "Hide Users" : "Show Users"}</button>}>
                <form className="form" onSubmit={handleCreateUser}>
                  <label>
                    Full Name
                    <input value={userForm.fullName} onChange={(e) => setUserForm((s) => ({ ...s, fullName: e.target.value }))} required />
                  </label>
                  <label>
                    Email
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} required />
                  </label>
                  <label>
                    Password
                    <input type="password" value={userForm.password} onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))} required />
                  </label>
                  <label>
                    Role
                    <select value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}>
                      <option value="parent">Parent</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      <option value="school_director">School Director</option>
                    </select>
                  </label>
                  {userForm.role === "parent" ? (
                    <div className="stack">
                      <label>
                        Select Existing Children
                        <select
                          multiple
                          value={userForm.studentIds}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                            setUserForm((s) => ({ ...s, studentIds: selected }));
                          }}
                        >
                          {linkableStudents.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName} ({student.sectionRecord?.gradeLevel?.name || student.className} {student.sectionRecord?.name || student.section || ""})
                            </option>
                          ))}
                        </select>
                      </label>
                      {linkableStudents.length ? (
                        <div className="muted small">
                          {linkableStudents.length} student(s) available to link (already-linked children are hidden).
                        </div>
                      ) : filteredStudents.length ? (
                        <div className="muted small">
                          All matching students already have a parent linked. Add a new child below or unlink from another parent first.
                        </div>
                      ) : (
                        <div className="muted small">No students match the current search or grade filter.</div>
                      )}
                      <div className="muted small">Or add a new child below.</div>
                      <div className="grid cols-2">
                        <label>
                          Child First Name
                          <input value={childForm.firstName} onChange={(e) => setChildForm((s) => ({ ...s, firstName: e.target.value }))} />
                        </label>
                        <label>
                          Child Last Name
                          <input value={childForm.lastName} onChange={(e) => setChildForm((s) => ({ ...s, lastName: e.target.value }))} />
                        </label>
                      </div>
                      <div className="grid cols-2">
                        <label>
                          Section
                          <select value={childForm.sectionId} onChange={(e) => setChildForm((s) => ({ ...s, sectionId: e.target.value }))}>
                            <option value="">Select section</option>
                            {structure.sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.gradeLevel?.name || "Grade"} - {section.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Date of Birth
                          <input type="date" value={childForm.dateOfBirth} onChange={(e) => setChildForm((s) => ({ ...s, dateOfBirth: e.target.value }))} />
                        </label>
                      </div>
                    </div>
                  ) : null}
                  <button type="submit">Create User</button>
                </form>

                {visibleLists.users ? (
                  <div className="table-wrapper" style={{ marginTop: "1rem" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td>{u.fullName}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{u.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </Card>

              <Card title="Create Student" actions={<button type="button" className="btn ghost" onClick={() => toggleList("students")}>{visibleLists.students ? "Hide Students" : "Show Students"}</button>}>
                <form className="form" onSubmit={handleCreateStudent}>
                  <label>
                    First Name
                    <input value={studentForm.firstName} onChange={(e) => setStudentForm((s) => ({ ...s, firstName: e.target.value }))} required />
                  </label>
                  <label>
                    Last Name
                    <input value={studentForm.lastName} onChange={(e) => setStudentForm((s) => ({ ...s, lastName: e.target.value }))} required />
                  </label>
                  <label>
                    Section
                    <select value={studentForm.sectionId} onChange={(e) => setStudentForm((s) => ({ ...s, sectionId: e.target.value }))} required>
                      <option value="">Select section</option>
                      {structure.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.gradeLevel?.name || "Grade"} - {section.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date of Birth
                    <input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm((s) => ({ ...s, dateOfBirth: e.target.value }))} />
                  </label>
                  <button type="submit">Create Student</button>
                </form>

                {visibleLists.students ? (
                  <div className="table-wrapper" style={{ marginTop: "1rem" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Grade</th>
                          <th>Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id}>
                            <td>
                              {s.firstName} {s.lastName}
                            </td>
                            <td>{s.sectionRecord?.gradeLevel?.name || s.className || "-"}</td>
                            <td>{s.sectionRecord?.name || s.section || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </Card>
            </div>
            </div>
          ) : null}

          {activePanel === "structure" ? (
            <div className="grid cols-2">
              <Card title="Define Grade" actions={<button type="button" className="btn ghost" onClick={() => toggleList("grades")}>{visibleLists.grades ? "Hide Grades" : "Show Grades"}</button>}>
                <form className="form" onSubmit={handleCreateGrade}>
                  <label>
                    Grade Name
                    <input value={gradeForm.name} onChange={(e) => setGradeForm((s) => ({ ...s, name: e.target.value }))} placeholder="Grade 10" required />
                  </label>
                  <label>
                    Sort Order
                    <input type="number" value={gradeForm.sortOrder} onChange={(e) => setGradeForm((s) => ({ ...s, sortOrder: Number(e.target.value) }))} />
                  </label>
                  <button type="submit">Save Grade</button>
                </form>
                {visibleLists.grades ? (
                  <ul className="stack" style={{ marginTop: "1rem" }}>
                    {structure.grades.map((grade) => (
                      <li key={grade.id} className="list-item">
                        <span>{grade.name}</span>
                        <span className="muted small">{grade.sections?.length || 0} sections</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card title="Define Section" actions={<button type="button" className="btn ghost" onClick={() => toggleList("sections")}>{visibleLists.sections ? "Hide Sections" : "Show Sections"}</button>}>
                <form className="form" onSubmit={handleCreateSection}>
                  <label>
                    Grade
                    <select value={sectionForm.gradeLevelId} onChange={(e) => setSectionForm((s) => ({ ...s, gradeLevelId: e.target.value }))} required>
                      <option value="">Select grade</option>
                      {structure.grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Section Name
                    <input value={sectionForm.name} onChange={(e) => setSectionForm((s) => ({ ...s, name: e.target.value }))} placeholder="A" required />
                  </label>
                  <label>
                    Code
                    <input value={sectionForm.code} onChange={(e) => setSectionForm((s) => ({ ...s, code: e.target.value }))} placeholder="10A" />
                  </label>
                  <button type="submit">Save Section</button>
                </form>
                {visibleLists.sections ? (
                  <ul className="stack" style={{ marginTop: "1rem" }}>
                    {structure.sections.map((section) => (
                      <li key={section.id} className="list-item">
                        <span>{section.gradeLevel?.name || "Grade"} - {section.name}</span>
                        <span className="muted small">{section.students?.length || 0} students</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card title="Define Course" actions={<button type="button" className="btn ghost" onClick={() => toggleList("courses")}>{visibleLists.courses ? "Hide Courses" : "Show Courses"}</button>}>
                <form className="form" onSubmit={handleCreateCourse}>
                  <label>
                    Course Name
                    <input value={courseForm.name} onChange={(e) => setCourseForm((s) => ({ ...s, name: e.target.value }))} placeholder="Mathematics" required />
                  </label>
                  <label>
                    Code
                    <input value={courseForm.code} onChange={(e) => setCourseForm((s) => ({ ...s, code: e.target.value }))} placeholder="MATH" />
                  </label>
                  <button type="submit">Save Course</button>
                </form>
                {visibleLists.courses ? (
                  <ul className="stack" style={{ marginTop: "1rem" }}>
                    {structure.courses.map((course) => (
                      <li key={course.id} className="list-item">
                        <span>{course.name}</span>
                        <span className="muted small">{course.code || "No code"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card title="Assign Course to Grade" actions={<button type="button" className="btn ghost" onClick={() => toggleList("gradeCourses")}>{visibleLists.gradeCourses ? "Hide Mappings" : "Show Mappings"}</button>}>
                <form className="form" onSubmit={handleAssignCourse}>
                  <label>
                    Grade
                    <select value={gradeCourseForm.gradeLevelId} onChange={(e) => setGradeCourseForm((s) => ({ ...s, gradeLevelId: e.target.value }))} required>
                      <option value="">Select grade</option>
                      {structure.grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>{grade.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Course
                    <select value={gradeCourseForm.courseId} onChange={(e) => setGradeCourseForm((s) => ({ ...s, courseId: e.target.value }))} required>
                      <option value="">Select course</option>
                      {structure.courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Assign Course</button>
                </form>
                {visibleLists.gradeCourses ? (
                  <ul className="stack" style={{ marginTop: "1rem" }}>
                    {structure.gradeCourses.map((item) => (
                      <li key={item.id} className="list-item">
                        <span>{item.gradeLevel?.name} → {item.course?.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </div>
          ) : null}

          {activePanel === "assignments" ? (
            <Card title="Assign Teacher to Course and Section" actions={<button type="button" className="btn ghost" onClick={() => toggleList("teacherAssignments")}>{visibleLists.teacherAssignments ? "Hide Assignments" : "Show Assignments"}</button>}>
              <form className="form" onSubmit={handleAssignTeacher}>
                <div className="grid cols-3">
                  <label>
                    Teacher
                    <select value={teacherAssignmentForm.teacherId} onChange={(e) => setTeacherAssignmentForm((s) => ({ ...s, teacherId: e.target.value }))} required>
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Course
                    <select value={teacherAssignmentForm.courseId} onChange={(e) => setTeacherAssignmentForm((s) => ({ ...s, courseId: e.target.value }))} required>
                      <option value="">Select course</option>
                      {structure.courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Section
                    <select value={teacherAssignmentForm.sectionId} onChange={(e) => setTeacherAssignmentForm((s) => ({ ...s, sectionId: e.target.value }))} required>
                      <option value="">Select section</option>
                      {structure.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.gradeLevel?.name || "Grade"} - {section.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit">Assign Teacher</button>
              </form>

              {visibleLists.teacherAssignments ? (
                <div className="table-wrapper" style={{ marginTop: "1rem" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th>Course</th>
                        <th>Section</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structure.teacherAssignments.map((item) => (
                        <tr key={item.id}>
                          <td>{item.teacher?.fullName}</td>
                          <td>{item.course?.name}</td>
                          <td>{item.section?.gradeLevel?.name} - {item.section?.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Card>
          ) : null}

          {activePanel === "ai" ? (
            <div className="grid cols-2">
              <Card title="Risk Threshold">
                <form className="form" onSubmit={handleUpdateRiskThreshold}>
                  <label>
                    High-risk cutoff
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={riskThreshold}
                      onChange={(e) => setRiskThreshold(e.target.value)}
                      required
                    />
                  </label>
                  <p className="muted small">
                    Students with a predicted risk probability at or above this value will be labeled high-risk.
                  </p>
                  <button type="submit">Save Threshold</button>
                </form>
              </Card>

              <Card
                title="Training Dataset"
                actions={
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setShowTrainingData((prev) => !prev)}
                  >
                    {showTrainingData ? "Hide Details" : "Show Details"}
                  </button>
                }
              >
                <form className="form" onSubmit={handleUploadTrainingCsv}>
                  <label>
                    Upload CSV file
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setTrainingCsvFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button type="submit" disabled={!trainingCsvFile}>Upload CSV</button>
                </form>
                <div className="stack" style={{ marginTop: "1rem" }}>
                  <div className="row">
                    <button type="button" className="btn secondary" onClick={handleTriggerTraining} disabled={!trainingCsvMeta}>
                      Trigger Model Training
                    </button>
                  </div>
                  {showTrainingData ? (
                    <div className="stack">
                      <div>
                        <span className="muted small">Current file</span>
                        <div>{trainingCsvMeta?.originalName || "No training CSV uploaded yet."}</div>
                      </div>
                      {trainingCsvMeta ? (
                        <div className="muted small">
                          Uploaded {trainingCsvMeta.uploadedAt ? new Date(trainingCsvMeta.uploadedAt).toLocaleString() : "recently"}.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card title="AI Control Summary">
                <div className="stats-grid">
                  <div className="stat-box">
                    <span>Threshold</span>
                    <strong>{riskThreshold}</strong>
                  </div>
                  <div className="stat-box">
                    <span>CSV Ready</span>
                    <strong>{trainingCsvMeta ? "Yes" : "No"}</strong>
                  </div>
                </div>
                <p className="muted small">
                  Upload a dataset, then run training. The AI service will use the configured threshold for future predictions.
                </p>
              </Card>
            </div>
          ) : null}

          {activePanel === "settings" ? (
            <Card title="System Settings" actions={<button type="button" className="btn ghost" onClick={() => toggleList("settings")}>{visibleLists.settings ? "Hide Settings" : "Show Settings"}</button>}>
              <form className="form" onSubmit={handleSaveSetting}>
                <label>
                  Key
                  <input value={settingForm.key} onChange={(e) => setSettingForm((s) => ({ ...s, key: e.target.value }))} required />
                </label>
                <label>
                  Value
                  <input value={settingForm.value} onChange={(e) => setSettingForm((s) => ({ ...s, value: e.target.value }))} required />
                </label>
                <button type="submit">Save Setting</button>
              </form>
              {visibleLists.settings ? (
                <ul className="stack" style={{ marginTop: "1rem" }}>
                  {settings.map((s) => (
                    <li key={s.id}>
                      <strong>{s.key}</strong>: {s.value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}
        </main>
      </div>
    </Layout>
  );
}

