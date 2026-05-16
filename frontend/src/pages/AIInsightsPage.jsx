import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Button } from "@/components/ui/button";

const sectionLabel = (student) => {
  const grade = student.sectionRecord?.gradeLevel?.name || student.className || "Grade";
  const section = student.sectionRecord?.name || student.section || "";
  return `${grade}${section ? ` ${section}` : ""}`.trim();
};

function AIInsightsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [riskData, setRiskData] = useState(null);
  const [summary, setSummary] = useState("");
  const [trainMessage, setTrainMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sectionOptions = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const id = student.sectionRecord?.id || student.sectionId;
      if (!id) return;
      const key = String(id);
      if (!map.has(key)) {
        map.set(key, { id: key, label: sectionLabel(student), count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [students]);

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

  const loadInsights = async (sectionId = selectedSectionId) => {
    setLoading(true);
    setError("");
    try {
      const params = sectionId ? { sectionId } : {};
      const [riskRes, summaryRes] = await Promise.all([
        api.get("/ai/risk-summary", { params }),
        api.get("/ai/summary", { params }),
      ]);
      setRiskData(riskRes.data.data || { records: [], predictions: [] });
      setSummary(summaryRes.data.data?.summary || summaryRes.data.summary || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load AI insights");
      setRiskData({ records: [], predictions: [] });
      setSummary("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [user?.role]);

  useEffect(() => {
    if (!students.length) {
      loadInsights("");
      return;
    }
    if (sectionOptions.length === 1 && !selectedSectionId) {
      setSelectedSectionId(sectionOptions[0].id);
      return;
    }
    loadInsights(selectedSectionId);
  }, [students, selectedSectionId, sectionOptions.length]);

  const handleTrain = async () => {
    setError("");
    try {
      const params = selectedSectionId ? { sectionId: selectedSectionId } : {};
      const response = await api.post("/ai/train", null, { params });
      setTrainMessage(response.data.message || "Training triggered");
      await loadInsights(selectedSectionId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to train model");
    }
  };

  const selectedLabel = sectionOptions.find((item) => item.id === selectedSectionId)?.label;

  return (
    <Layout>
      <div className="stack">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a class section to summarize risk and performance for those students.
          </p>
        </div>

        <AlertBanner variant="error">{error}</AlertBanner>
        {trainMessage ? <p className="success">{trainMessage}</p> : null}

        <Card title="Class / section">
          {sectionOptions.length > 0 ? (
            <div className="form">
              <label>
                Select class
                <select
                  value={selectedSectionId}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                >
                  <option value="">All assigned students ({students.length})</option>
                  {sectionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.count} students)
                    </option>
                  ))}
                </select>
              </label>
              {selectedSectionId ? (
                <p className="muted small">
                  Showing insights for <strong>{selectedLabel}</strong>.
                </p>
              ) : (
                <p className="muted small">Showing insights across all students you can access.</p>
              )}
            </div>
          ) : (
            <p className="muted">
              No students are linked to your account yet. Teachers need a section assignment; parents need linked children.
            </p>
          )}
        </Card>

        <Card title="AI Summary">
          {loading ? (
            <p className="muted">Loading...</p>
          ) : (
            <p>{summary || "No summary available yet."}</p>
          )}
        </Card>

        <Card title="Risk Predictions">
          <div className="row">
            <Button variant="secondary" type="button" onClick={() => loadInsights(selectedSectionId)} disabled={loading}>
              Refresh
            </Button>
            {user?.role === "admin" ? (
              <Button type="button" onClick={handleTrain}>
                Train Model
              </Button>
            ) : null}
          </div>
          <pre className="json">{JSON.stringify(riskData || { records: [], predictions: [] }, null, 2)}</pre>
        </Card>
      </div>
    </Layout>
  );
}

export default AIInsightsPage;

