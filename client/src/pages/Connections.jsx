import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const DEFAULTS = { name: '', hosts: '127.0.0.1', port: '9042', datacenter: 'datacenter1', keyspace: '', username: '', password: '', ssl: false };

function Modal({ conn, onClose, onSave }) {
    const [form, setForm] = useState(conn || DEFAULTS);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const f = k => e => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

    const test = async () => {
        if (!conn?.id) return;
        setTesting(true); setTestResult(null);
        const r = await api.connections.test(conn.id);
        setTesting(false); setTestResult(r);
    };

    const save = async () => {
        setSaving(true);
        try {
            const saved = conn?.id
                ? await api.connections.update(conn.id, form)
                : await api.connections.create(form);
            onSave(saved);
        } finally { setSaving(false); }
    };

    const field = (label, key, opts = {}) => (
        <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={form[key]} onChange={f(key)} {...opts} />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-white font-semibold">{conn?.id ? 'Edit Connection' : 'Add Connection'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {field('Connection Name *', 'name', { placeholder: 'My Cluster' })}
                    {field('Hosts (comma-separated) *', 'hosts', { placeholder: '10.0.0.1, 10.0.0.2' })}
                    <div className="grid grid-cols-2 gap-3">
                        {field('Port', 'port', { type: 'number' })}
                        {field('Datacenter', 'datacenter')}
                    </div>
                    {field('Default Keyspace', 'keyspace', { placeholder: 'optional' })}
                    {field('Username', 'username', { placeholder: 'optional' })}
                    {field('Password', 'password', { type: 'password', placeholder: 'optional' })}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.ssl} onChange={f('ssl')} className="accent-indigo-500" />
                        <span className="text-sm text-slate-300">Enable SSL/TLS</span>
                    </label>
                    {testResult && (
                        <div className={`text-sm rounded-lg px-4 py-2.5 ${testResult.ok ? 'bg-green-950/50 border border-green-800 text-green-400' : 'bg-red-950/50 border border-red-800 text-red-400'}`}>
                            {testResult.ok ? '✓ ' + testResult.message : '✗ ' + testResult.error}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 gap-3">
                    {conn?.id
                        ? <button onClick={test} disabled={testing} className="text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50">
                            {testing ? 'Testing…' : 'Test Connection'}
                          </button>
                        : <span />}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Connections() {
    const navigate = useNavigate();
    const [connections, setConnections] = useState([]);
    const [modal, setModal] = useState(null);
    const [connecting, setConnecting] = useState(null);

    useEffect(() => { api.connections.list().then(setConnections); }, []);

    const logout = () => { localStorage.removeItem('scyllaui_token'); navigate('/login'); };

    const connect = async (conn) => {
        setConnecting(conn.id);
        try {
            await api.explorer.connect(conn.id);
            navigate(`/explorer?connection=${conn.id}`);
        } catch (err) { alert('Failed to connect: ' + err.message); }
        finally { setConnecting(null); }
    };

    const remove = async (id) => {
        if (!confirm('Delete this connection?')) return;
        await api.connections.remove(id);
        setConnections(cs => cs.filter(c => c.id !== id));
    };

    const onSave = (saved) => {
        setConnections(cs => {
            const idx = cs.findIndex(c => c.id === saved.id);
            return idx === -1 ? [...cs, saved] : cs.map(c => c.id === saved.id ? saved : c);
        });
        setModal(null);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="h-14 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🪸</span>
                    <span className="font-bold text-white">ScyllaUI</span>
                </div>
                <button onClick={logout} className="text-slate-400 hover:text-white text-sm transition-colors">Sign out</button>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-white">Connections</h2>
                        <p className="text-slate-400 text-sm mt-0.5">Manage your ScyllaDB clusters</p>
                    </div>
                    <button onClick={() => setModal({})} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5">
                        + Add Connection
                    </button>
                </div>

                {connections.length === 0 ? (
                    <div className="text-center py-20 text-slate-600">
                        <div className="text-5xl mb-4">🪸</div>
                        <p className="text-lg font-medium text-slate-500">No connections yet</p>
                        <p className="text-sm mt-1">Add your first ScyllaDB connection to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {connections.map(c => (
                            <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-900/40 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-sm">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white text-sm">{c.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                                        {c.hosts}:{c.port}
                                        {c.keyspace && <> · <span className="text-indigo-400">{c.keyspace}</span></>}
                                        {c.ssl && <span className="ml-2 bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">SSL</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => connect(c)} disabled={connecting === c.id}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
                                        {connecting === c.id ? 'Connecting…' : 'Connect'}
                                    </button>
                                    <button onClick={() => setModal(c)} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800">✎</button>
                                    <button onClick={() => remove(c.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800">🗑</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {modal !== null && <Modal conn={modal.id ? modal : null} onClose={() => setModal(null)} onSave={onSave} />}
        </div>
    );
}
