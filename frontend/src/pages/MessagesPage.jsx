import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Layout from "../components/Layout";
import api, { getApiBaseUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

const formatRole = (role) => role?.replace("_", " ");

export default function MessagesPage() {
  const { token, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [contacts, setContacts] = useState({ studentThreads: [], directThreads: [] });
  const [contactSelection, setContactSelection] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sseUrl = useMemo(() => {
    const baseUrl = getApiBaseUrl();
    return token ? `${baseUrl}/messages/stream?token=${encodeURIComponent(token)}` : null;
  }, [token]);

  const loadThreads = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/messages/threads");
      setThreads(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load threads.");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId) => {
    if (!threadId) return;
    setError("");
    try {
      const response = await api.get(`/messages/threads/${threadId}`);
      setActiveThread(response.data.data.thread);
      setMessages(response.data.data.messages || []);
      await api.post(`/messages/threads/${threadId}/read`).catch(() => null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load messages.");
    }
  };

  const loadContacts = async () => {
    try {
      const response = await api.get("/messages/contacts");
      setContacts(response.data.data || { studentThreads: [], directThreads: [] });
    } catch (_err) {
      // no-op
    }
  };

  useEffect(() => {
    loadThreads();
    loadContacts();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      await loadThreads();
      if (activeThread?.id) {
        await loadMessages(activeThread.id);
      }
    };
    const timer = setInterval(refresh, 20000);
    return () => clearInterval(timer);
  }, [activeThread?.id]);

  useEffect(() => {
    if (!sseUrl) return undefined;
    const source = new EventSource(sseUrl);

    const onMessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === payload.threadId
              ? { ...thread, unreadCount: (thread.unreadCount || 0) + 1 }
              : thread,
          ),
        );
        if (activeThread?.id === payload.threadId) {
          setMessages((prev) => [...prev, payload]);
          api.post(`/messages/threads/${payload.threadId}/read`).catch(() => null);
        }
      } catch (_err) {
        // ignore
      }
    };

    const onError = () => {
      setError("Live messages disconnected. Reload to reconnect.");
      source.close();
    };

    source.addEventListener("message", onMessage);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("message", onMessage);
      source.removeEventListener("error", onError);
      source.close();
    };
  }, [sseUrl, activeThread]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !activeThread) return;
    setError("");
    try {
      await api.post("/messages/send", {
        threadId: activeThread.id,
        body: draft,
      });
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), body: draft, sender: { fullName: user?.fullName, role: user?.role } },
      ]);
      setDraft("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const startThread = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !contactSelection) return;
    setError("");
    try {
      const payload = JSON.parse(contactSelection);
      const response = await api.post("/messages/send", { ...payload, body: draft });
      const nextThreadId = response.data.data?.threadId;
      setDraft("");
      setContactSelection("");
      await loadThreads();
      if (nextThreadId) {
        await loadMessages(nextThreadId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start conversation.");
    }
  };

  const threadTitle = (thread) => {
    if (thread.type === "student") {
      return `${thread.student?.firstName} ${thread.student?.lastName} (${thread.student?.className})`;
    }
    const counterpart = user?.role === "teacher" ? thread.admin : thread.teacher;
    return counterpart?.fullName || "Direct thread";
  };

  const threadSubtitle = (thread) => {
    if (thread.type === "student") {
      return `Teacher: ${thread.teacher?.fullName} · Parent: ${thread.parent?.fullName}`;
    }
    const counterpart = user?.role === "teacher" ? thread.admin : thread.teacher;
    return `${formatRole(counterpart?.role)} · Direct`;
  };

  return (
    <Layout>
      <div className="stack">
        <h1 className="hero-title">Messages from School</h1>
        <p className="hero-sub">Read and send school updates in a clean, simple inbox layout.</p>
        {error ? <div className="alert error">{error}</div> : null}

        <Card>
          <div className="row between" style={{ marginBottom: "0.75rem" }}>
            <strong>Inbox</strong>
            {loading ? <span className="muted small">Loading...</span> : null}
          </div>

          <form className="message-form" onSubmit={startThread} style={{ marginBottom: "1rem" }}>
            <select value={contactSelection} onChange={(event) => setContactSelection(event.target.value)}>
              <option value="">Start new conversation...</option>
              {contacts.studentThreads.map((item) => (
                <option
                  key={`student-${item.student?.id}-${item.teacher?.id}-${item.parent?.id}`}
                  value={JSON.stringify({
                    studentId: item.student?.id,
                    teacherId: item.teacher?.id,
                    parentId: item.parent?.id,
                  })}
                >
                  {item.student?.firstName} {item.student?.lastName} · {item.teacher?.fullName}
                </option>
              ))}
              {contacts.directThreads.map((item) => (
                <option
                  key={`direct-${item.teacher?.id}-${item.admin?.id}`}
                  value={JSON.stringify({
                    teacherId: item.teacher?.id,
                    adminId: item.admin?.id,
                  })}
                >
                  Direct · {item.teacher?.fullName} ↔ {item.admin?.fullName}
                </option>
              ))}
            </select>
            <input placeholder="Write a message" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <button type="submit" className="btn primary">
              Start
            </button>
          </form>

          <div className="message-list-card">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={`message-row ${activeThread?.id === thread.id ? "message-highlight" : ""}`}
                onClick={() => loadMessages(thread.id)}
              >
                <div className="mail-icon">✉</div>
                <div>
                  <div className="row between">
                    <strong>{threadTitle(thread)}</strong>
                    <span className="date-meta">
                      {thread.lastMessageAt ? new Date(thread.lastMessageAt).toISOString().slice(0, 10) : ""}
                    </span>
                  </div>
                  <div className="muted">{threadSubtitle(thread)}</div>
                  <div className="muted small">{thread.lastMessagePreview || "Open thread to read the latest message..."}</div>
                  {thread.unreadCount > 0 ? <span className="new-tag">New</span> : null}
                </div>
                <div className="date-meta">{thread.unreadCount > 0 ? `🔴 ${thread.unreadCount}` : ""}</div>
              </button>
            ))}
            {!threads.length && !loading ? <p className="muted">No threads yet.</p> : null}
          </div>
        </Card>

        {activeThread ? (
          <Card title={threadTitle(activeThread)}>
            <div className="messages-feed">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble ${message.sender?.role === user?.role ? "sent" : "received"}`}
                >
                  <div className="message-meta">
                    <span>{message.sender?.fullName || "System"}</span>
                    <span className="badge soft">{formatRole(message.sender?.role) || "system"}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              ))}
              {!messages.length && activeThread ? <p className="muted">No messages yet.</p> : null}
            </div>

            <form className="message-form" onSubmit={sendMessage} style={{ marginTop: "1rem" }}>
              <input
                placeholder="Type your message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" className="btn primary">
                Send
              </button>
            </form>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
