import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../FireBase/firebase";
import "../AdminPannel/AdminPanel.css";
import "./AdminModules.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

/* SVG Icons*/
const Icon = {
  Back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Add: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  Modules: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Sync: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Delete: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Question: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

/* API helpers */
async function safeJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function getAuthToken() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Authentication required.");
  return token;
}

async function fetchModules() {
  const res = await fetch(`${API_BASE}/courses/modules/`);
  if (!res.ok) return [];
  return res.json();
}

async function importModuleToDjango(modulePayload) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/courses/import/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ module: modulePayload }),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || "Failed to save module.");
  }
  return res.json();
}

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`ap-toast ap-toast-${toast.type}`}>
      <span className="ap-toast-icon">
        {toast.type === "success" ? <Icon.Check /> : <Icon.Alert />}
      </span>
      {toast.msg}
    </div>
  );
}

/* ── Question Editor ────────────────────────────────────────── */
function QuestionEditor({ questions = [], onChange }) {
  const addQuestion = () =>
    onChange([...questions, { text: "", choices: [{ text: "", is_correct: false }] }]);

  const removeQuestion = (qi) => {
    const copy = [...questions];
    copy.splice(qi, 1);
    onChange(copy);
  };

  const updateQ = (qi, field, val) => {
    const copy = [...questions];
    copy[qi] = { ...copy[qi], [field]: val };
    onChange(copy);
  };

  const addChoice = (qi) => {
    const copy = [...questions];
    copy[qi].choices = [...(copy[qi].choices || []), { text: "", is_correct: false }];
    onChange(copy);
  };

  const removeChoice = (qi, ci) => {
    const copy = [...questions];
    copy[qi].choices.splice(ci, 1);
    onChange(copy);
  };

  const updateChoice = (qi, ci, field, val) => {
    const copy = [...questions];
    if (field === "is_correct" && val) {
      // Radio behaviour — uncheck others
      copy[qi].choices = copy[qi].choices.map((c, i) => ({ ...c, is_correct: i === ci }));
    } else {
      copy[qi].choices[ci] = { ...copy[qi].choices[ci], [field]: val };
    }
    onChange(copy);
  };

  return (
    <div className="am-questions">
      <div className="am-questions-header">
        <h3 className="am-questions-title">Quiz Questions</h3>
        <button type="button" className="ap-btn ap-btn-outline ap-btn-sm" onClick={addQuestion}>
          <span style={{ width: 14, height: 14, display: "flex" }}><Icon.Question /></span>
          Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <div className="am-empty-questions">No questions yet. Add a question to include a quiz.</div>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="am-question-card">
          <div className="am-question-header">
            <span className="am-question-num">Q{qi + 1}</span>
            <input
              className="ap-form-input am-question-input"
              placeholder="Question text…"
              value={q.text || ""}
              onChange={(e) => updateQ(qi, "text", e.target.value)}
            />
            <button type="button" className="am-icon-btn danger" onClick={() => removeQuestion(qi)}>
              <Icon.Close />
            </button>
          </div>

          <div className="am-choices">
            {(q.choices || []).map((c, ci) => (
              <div key={ci} className={`am-choice-row ${c.is_correct ? "correct" : ""}`}>
                <label className="am-correct-toggle" title="Mark as correct answer">
                  <input
                    type="radio"
                    name={`correct-q${qi}`}
                    checked={!!c.is_correct}
                    onChange={(e) => updateChoice(qi, ci, "is_correct", e.target.checked)}
                  />
                  <span className="am-radio-dot" />
                </label>
                <input
                  className="ap-form-input am-choice-input"
                  placeholder={`Choice ${ci + 1}…`}
                  value={c.text || ""}
                  onChange={(e) => updateChoice(qi, ci, "text", e.target.value)}
                />
                {(q.choices || []).length > 1 && (
                  <button type="button" className="am-icon-btn" onClick={() => removeChoice(qi, ci)}>
                    <Icon.Close />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="am-add-choice-btn" onClick={() => addChoice(qi)}>
              + Add Choice
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Module Edit Drawer ─────────────────────────────────────── */
function ModuleDrawer({ editing, onClose, onSave, saving, toast }) {
  if (!editing) return null;

  return (
    <div className="am-drawer-backdrop" onClick={onClose}>
      <aside className="am-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="am-drawer-header">
          <h2 className="am-drawer-title">
            {editing.id ? "Edit Module" : "New Module"}
          </h2>
          <button className="am-icon-btn" onClick={onClose}><Icon.Close /></button>
        </div>

        <div className="am-drawer-body">
          {/* Basic fields */}
          <div className="ap-form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="ap-form-group">
              <label className="ap-form-label">Title *</label>
              <input
                className="ap-form-input"
                placeholder="e.g. Introduction to Python"
                value={editing.title || ""}
                onChange={(e) => onSave.setField("title", e.target.value)}
              />
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Description</label>
              <textarea
                className="ap-form-textarea"
                placeholder="What will students learn in this module?"
                value={editing.description || ""}
                onChange={(e) => onSave.setField("description", e.target.value)}
              />
            </div>
          </div>

          <div className="ap-form-grid">
            <div className="ap-form-group">
              <label className="ap-form-label">Video URL / ID</label>
              <input
                className="ap-form-input"
                placeholder="YouTube ID or full URL"
                value={editing.video_url || ""}
                onChange={(e) => onSave.setField("video_url", e.target.value)}
              />
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Video Host</label>
              <select
                className="ap-form-input ap-form-select"
                value={editing.video_host || "youtube"}
                onChange={(e) => onSave.setField("video_host", e.target.value)}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Duration (seconds)</label>
              <input
                className="ap-form-input"
                type="number"
                min="0"
                placeholder="e.g. 600"
                value={editing.video_duration || ""}
                onChange={(e) => onSave.setField("video_duration", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Display Order</label>
              <input
                className="ap-form-input"
                type="number"
                min="0"
                placeholder="e.g. 1"
                value={editing.order ?? ""}
                onChange={(e) => onSave.setField("order", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Required Watch % (0–1)</label>
              <input
                className="ap-form-input"
                type="number"
                step="0.05"
                min="0"
                max="1"
                placeholder="e.g. 0.80"
                value={editing.required_percent ?? 0.95}
                onChange={(e) => onSave.setField("required_percent", parseFloat(e.target.value) || 0.95)}
              />
            </div>

            <div className="ap-form-group">
              <label className="ap-form-label">Quiz Pass Score (0–1)</label>
              <input
                className="ap-form-input"
                type="number"
                step="0.05"
                min="0"
                max="1"
                placeholder="e.g. 0.70"
                value={editing.quiz_passing_score ?? 0.7}
                onChange={(e) => onSave.setField("quiz_passing_score", parseFloat(e.target.value) || 0.7)}
              />
            </div>
          </div>

          <div className="ap-form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="am-switch-label">
              <div className={`am-switch ${editing.published ? "on" : ""}`}
                onClick={() => onSave.setField("published", !editing.published)}>
                <div className="am-switch-knob" />
              </div>
              <span>{editing.published ? "Published" : "Draft"}</span>
            </label>
          </div>

          {/* Quiz questions */}
          <QuestionEditor
            questions={editing.questions || []}
            onChange={(qs) => onSave.setField("questions", qs)}
          />
        </div>

        <div className="am-drawer-footer">
          <button className="ap-btn ap-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ap-btn ap-btn-primary" onClick={onSave.submit} disabled={saving}>
            <span style={{ width: 15, height: 15, display: "flex" }}><Icon.Save /></span>
            {saving ? "Saving…" : "Save Module"}
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function AdminModules() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchModules();
    setModules(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () =>
    setEditing({
      title: "", description: "", video_url: "", video_host: "youtube",
      video_duration: 0, order: modules.length, questions: [], published: true,
      required_percent: 0.95, quiz_passing_score: 0.7,
    });

  const setField = (field, value) => setEditing((e) => ({ ...e, [field]: value }));

  const handleSave = async () => {
    if (!editing?.title?.trim()) { showToast("error", "Module title is required."); return; }
    setSaving(true);
    try {
      await importModuleToDjango(editing);
      await load();
      setEditing(null);
      showToast("success", `Module "${editing.title}" saved successfully.`);
    } catch (err) {
      showToast("error", err.message || "Failed to save module.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (m) => {
    showToast("success", `Syncing "${m.title}"…`);
    try {
      await importModuleToDjango(m);
      showToast("success", `"${m.title}" synced.`);
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const filtered = modules.filter(
    (m) => !search || (m.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ap-shell">
      <Toast toast={toast} />

      {editing && (
        <ModuleDrawer
          editing={editing}
          onClose={() => setEditing(null)}
          onSave={{ setField, submit: handleSave }}
          saving={saving}
        />
      )}

      {/* ── Sidebar (minimal back panel) ────────────────── */}
      <aside className="ap-sidebar">
        <div className="ap-sidebar-brand">
          <img src="/Logo.png" alt="Pixels2Play" style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div>
            <div className="ap-brand-title">Pixels2Play</div>
            <div className="ap-brand-sub">Admin Console</div>
          </div>
        </div>
        <nav className="ap-nav">
          <button className="ap-nav-item" onClick={() => navigate("/admin")}>
            <span className="ap-nav-icon"><Icon.Back /></span>
            Back to Dashboard
          </button>
          <button className="ap-nav-item active">
            <span className="ap-nav-icon"><Icon.Modules /></span>
            Manage Modules
          </button>
        </nav>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="ap-main">
        <header className="ap-topbar">
          <div className="ap-topbar-left">
            <span className="ap-topbar-title">Video Modules</span>
            {!loading && (
              <span className="ap-topbar-count">{modules.length} modules</span>
            )}
          </div>
          <div className="ap-topbar-right">
            <span className="ap-admin-badge">
              <span style={{ width: 12, height: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </span>
              Admin
            </span>
          </div>
        </header>

        <main className="ap-content">
          <div className="ap-toolbar">
            <div className="ap-search-wrap">
              <span className="ap-search-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
              <input
                className="ap-search-input"
                placeholder="Search modules…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="ap-btn ap-btn-primary" onClick={startNew}>
              <span style={{ width: 15, height: 15, display: "flex" }}><Icon.Add /></span>
              New Module
            </button>
          </div>

          {loading ? (
            <div className="ap-loading-center"><div className="ap-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon-wrap"><Icon.Modules /></div>
              <h3>{search ? "No results" : "No modules yet"}</h3>
              <p>{search ? "Try a different search." : "Create your first video module."}</p>
            </div>
          ) : (
            <div className="am-modules-grid">
              {filtered.map((m) => (
                <div key={m.id} className="am-module-card">
                  <div className="am-module-card-header">
                    <div className="am-module-icon-wrap">
                      <Icon.Modules />
                    </div>
                    <div className="am-module-meta">
                      <div className="am-module-order">Module {m.order ?? "—"}</div>
                      {m.published ? (
                        <span className="ap-status-badge status-completed">Published</span>
                      ) : (
                        <span className="ap-status-badge status-pending">Draft</span>
                      )}
                    </div>
                  </div>

                  <h3 className="am-module-title">{m.title || "Untitled"}</h3>
                  {m.description && (
                    <p className="am-module-desc">{m.description}</p>
                  )}

                  <div className="am-module-stats">
                    {m.video_host && (
                      <span className="ap-auth-chip">{m.video_host}</span>
                    )}
                    {m.video_duration > 0 && (
                      <span className="ap-auth-chip">{Math.round(m.video_duration / 60)} min</span>
                    )}
                    {(m.questions?.length || 0) > 0 && (
                      <span className="ap-auth-chip">{m.questions.length} questions</span>
                    )}
                  </div>

                  <div className="am-module-actions">
                    <button
                      className="ap-btn ap-btn-outline ap-btn-sm"
                      onClick={() => setEditing(m)}
                    >
                      <span style={{ width: 13, height: 13, display: "flex" }}><Icon.Edit /></span>
                      Edit
                    </button>
                    <button
                      className="ap-btn ap-btn-ghost ap-btn-sm"
                      onClick={() => handleSync(m)}
                    >
                      <span style={{ width: 13, height: 13, display: "flex" }}><Icon.Sync /></span>
                      Sync
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
