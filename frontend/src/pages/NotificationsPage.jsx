import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import api, { getApiBaseUrl } from "../api/client";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const fallbackQuestionOptions = [
  { key: "born_place", label: "your born place" },
  { key: "child_first_name", label: "child first name" },
  { key: "primary_school_name", label: "primary school name" },
  { key: "favourite_number", label: "favourite number" },
];

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [questionStatus, setQuestionStatus] = useState({ enabled: false, configured: true, options: [] });
  const [questionForm, setQuestionForm] = useState({ questionKey: "", answer: "" });
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sseUrl = useMemo(() => {
    const baseUrl = getApiBaseUrl();
    return token ? `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}` : null;
  }, [token]);

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionStatus = async () => {
    try {
      const response = await api.get("/auth/security-question/status");
      const data = response.data.data || {};
      const options = Array.isArray(data.options) && data.options.length ? data.options : fallbackQuestionOptions;
      setQuestionStatus({
        enabled: Boolean(data.enabled),
        configured: Boolean(data.configured),
        options,
      });
      setQuestionForm((prev) => ({
        ...prev,
        questionKey: prev.questionKey || options[0]?.key || "",
      }));
    } catch (_err) {
      // no-op
    }
  };

  useEffect(() => {
    loadNotifications();
    loadQuestionStatus();
  }, []);

  useEffect(() => {
    if (!sseUrl) return undefined;
    const source = new EventSource(sseUrl);

    const onNotification = (event) => {
      try {
        const next = JSON.parse(event.data);
        setNotifications((prev) => {
          const existing = prev.find((item) => item.id === next.id);
          if (existing) return prev;
          return [next, ...prev];
        });
      } catch (_err) {
        // ignore malformed events
      }
    };

    const onError = () => {
      setError("Live updates disconnected. Reload to reconnect.");
      source.close();
    };

    source.addEventListener("notification", onNotification);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("notification", onNotification);
      source.removeEventListener("error", onError);
      source.close();
    };
  }, [sseUrl]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    } catch (_err) {
      // no-op
    }
  };

  const setupQuestion = async (event) => {
    event.preventDefault();
    if (!questionForm.questionKey || !questionForm.answer.trim()) return;

    setQuestionSubmitting(true);
    setQuestionFeedback("");
    setError("");
    try {
      await api.post("/auth/security-question/setup", {
        questionKey: questionForm.questionKey,
        answer: questionForm.answer,
      });
      setQuestionFeedback("Security question saved.");
      setQuestionForm((prev) => ({ ...prev, answer: "" }));
      await Promise.all([loadQuestionStatus(), loadNotifications()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save security question.");
    } finally {
      setQuestionSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="stack">
        {questionStatus.enabled && !questionStatus.configured ? (
          <Card title="Set Security Question">
            <p className="muted small">
              Choose one question and answer it now. This is required for future password reset.
            </p>
            <form className="form" onSubmit={setupQuestion}>
              <label>
                Security question
                <select
                  value={questionForm.questionKey}
                  onChange={(event) =>
                    setQuestionForm((prev) => ({ ...prev, questionKey: event.target.value }))
                  }
                  required
                >
                  {(questionStatus.options.length ? questionStatus.options : fallbackQuestionOptions).map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your answer
                <input
                  value={questionForm.answer}
                  onChange={(event) =>
                    setQuestionForm((prev) => ({ ...prev, answer: event.target.value }))
                  }
                  placeholder="Type your answer"
                  required
                />
              </label>
              <button className="btn primary" type="submit" disabled={questionSubmitting}>
                {questionSubmitting ? "Saving..." : "Save security question"}
              </button>
              {questionFeedback ? <p className="success small">{questionFeedback}</p> : null}
            </form>
          </Card>
        ) : null}

        <Card title="Notifications">
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {!notifications.length && !loading ? <p>No notifications yet.</p> : null}
          <ul className="simple-list">
            {notifications.map((item) => (
              <li key={item.id}>
                <div className="row between">
                  <div>
                    <strong>{item.title}</strong>
                    <div>{item.message}</div>
                    <small>
                      {item.type} · {new Date(item.createdAt).toLocaleString()}
                    </small>
                  </div>
                  {!item.isRead ? (
                    <button className="btn secondary" onClick={() => markRead(item.id)}>
                      Mark read
                    </button>
                  ) : (
                    <span className="muted">Read</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Layout>
  );
}

