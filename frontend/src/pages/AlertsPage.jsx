import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import api, { getApiBaseUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AlertsPage() {
  const { user, token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notesByAlert, setNotesByAlert] = useState({});

  const sseUrl = useMemo(() => {
    const baseUrl = getApiBaseUrl();
    return token ? `${baseUrl}/alerts/stream?token=${encodeURIComponent(token)}` : null;
  }, [token]);

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/alerts");
      setAlerts(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (!sseUrl) return undefined;
    const source = new EventSource(sseUrl);

    const onAlert = (event) => {
      try {
        const next = JSON.parse(event.data);
        setAlerts((prev) => {
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

    source.addEventListener("alert", onAlert);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("alert", onAlert);
      source.removeEventListener("error", onError);
      source.close();
    };
  }, [sseUrl]);

  const markRead = async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
    } catch (_err) {
      // no-op
    }
  };

  const handleAlert = async (id) => {
    try {
      await api.patch(`/alerts/${id}/handle`);
      setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, status: "handled", isRead: true } : item)));
    } catch (_err) {
      // no-op
    }
  };

  const forwardAlert = async (id) => {
    try {
      const note = notesByAlert[id] || "";
      await api.post(`/alerts/${id}/forward`, { note });
      setAlerts((prev) => prev.map((item) => (item.id === id ? { ...item, status: "forwarded", isRead: true } : item)));
    } catch (_err) {
      // no-op
    }
  };

  return (
    <Layout>
      <div className="stack">
        <Card title="Alerts">
          {loading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {!alerts.length && !loading ? <p>No alerts yet.</p> : null}
          <ul className="simple-list">
            {alerts.map((item) => (
              <li key={item.id}>
                <div className="row between">
                  <div>
                    <strong>{item.title}</strong>
                    <div>{item.message}</div>
                    <small>
                      {item.student?.firstName ? `${item.student.firstName} ${item.student.lastName}` : ""}
                      {item.student?.firstName ? " · " : ""}
                      {item.status} · {new Date(item.createdAt).toLocaleString()}
                    </small>
                  </div>
                  {user?.role === "teacher" ? (
                    <div className="row" style={{ alignItems: "center" }}>
                      <input
                        className="input"
                        placeholder="Add note to parent (optional)"
                        value={notesByAlert[item.id] || ""}
                        onChange={(event) =>
                          setNotesByAlert((prev) => ({ ...prev, [item.id]: event.target.value }))
                        }
                      />
                      <button className="btn secondary" onClick={() => handleAlert(item.id)}>
                        Handle
                      </button>
                      <button className="btn primary" onClick={() => forwardAlert(item.id)}>
                        Forward
                      </button>
                    </div>
                  ) : (
                    <button className="btn secondary" onClick={() => markRead(item.id)}>
                      {item.isRead ? "Read" : "Mark read"}
                    </button>
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
