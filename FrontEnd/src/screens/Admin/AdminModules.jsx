import React, { useEffect, useState } from 'react';
import { getModulesFirestore, createModuleFirestore, updateModuleFirestore, deleteModuleFirestore, syncModuleToBackend } from '../../api/firestoreModules';
import { auth } from '../../FireBase/firebase';

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getModulesFirestore();
      setModules(data);
      setLoading(false);
    }
    load();
  }, []);

  const startNew = () => setEditing({ title: '', description: '', video_url: '', video_host: 'youtube', video_duration: 0, order: 0, questions: [], published: true });

  const editModule = (m) => setEditing(m);

  const save = async () => {
    try {
      setSaving(true);
      setMsg('');
      if (!editing.id) {
        const added = await createModuleFirestore(editing);
        setModules(prev => [added, ...prev]);
        setEditing(null);
      } else {
        await updateModuleFirestore(editing.id, editing);
        setModules(prev => prev.map(p => p.id === editing.id ? editing : p));
        setEditing(null);
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete module?')) return;
    await deleteModuleFirestore(id);
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const sync = async (m) => {
    try {
      setMsg('Syncing...');
      await syncModuleToBackend(m.id, m);
      setMsg('Synced OK');
    } catch (err) {
      setMsg('Sync error: ' + err.message);
    }
  };

  if (loading) return <div>Loading modules...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Manage Modules (Firestore)</h2>
      <button onClick={startNew}>+ New Module</button>
      <div style={{ marginTop: 12 }}>{msg}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 12 }}>
        <div>
          <h3>Modules</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {modules.map(m => (
              <li key={m.id} style={{ marginBottom: 8, border: '1px solid #eee', padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{m.title || '(no title)'}</strong>
                  <div>
                    <button onClick={() => editModule(m)}>Edit</button>
                    <button onClick={() => sync(m)} style={{ marginLeft: 8 }}>Sync</button>
                    <button onClick={() => remove(m.id)} style={{ marginLeft: 8 }}>Delete</button>
                  </div>
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>{m.description}</div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {editing ? (
            <div style={{ border: '1px solid #eee', padding: 16 }}>
              <h3>{editing.id ? 'Edit' : 'New'} Module</h3>
              <div>
                <label>Title</label>
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label>Description</label>
                <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <label>Video URL / ID</label>
                <input value={editing.video_url} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} />
              </div>
              <div>
                <label>Video host</label>
                <select value={editing.video_host} onChange={(e) => setEditing({ ...editing, video_host: e.target.value })}>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <h4>Questions</h4>
                {editing.questions && editing.questions.map((q, qi) => (
                  <div key={qi} style={{ border: '1px dashed #ddd', padding: 8, marginBottom: 8 }}>
                    <input value={q.text} placeholder="Question" onChange={(e) => {
                      const copy = [...editing.questions]; copy[qi].text = e.target.value; setEditing({ ...editing, questions: copy });
                    }} />
                    <div>
                      {q.choices && q.choices.map((c, ci) => (
                        <div key={ci}>
                          <input value={c.text} placeholder="Choice" onChange={(e) => {
                            const copy = [...editing.questions]; copy[qi].choices[ci].text = e.target.value; setEditing({ ...editing, questions: copy });
                          }} />
                          <label>
                            <input type="checkbox" checked={!!c.is_correct} onChange={(e) => {
                              const copy = [...editing.questions]; copy[qi].choices[ci].is_correct = e.target.checked; setEditing({ ...editing, questions: copy });
                            }} /> Correct
                          </label>
                        </div>
                      ))}
                      <button onClick={() => {
                        const copy = [...editing.questions]; copy[qi].choices.push({ text: '', is_correct: false }); setEditing({ ...editing, questions: copy });
                      }}>+ Choice</button>
                      <button onClick={() => { const copy = [...editing.questions]; copy.splice(qi, 1); setEditing({ ...editing, questions: copy }); }}>Delete Q</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setEditing({ ...editing, questions: [...(editing.questions || []), { text: '', choices: [{ text: '', is_correct: false }] }] })}>+ Question</button>
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, color: '#777' }}>Select or create a module to edit</div>
          )}
        </div>
      </div>
    </div>
  );
}
