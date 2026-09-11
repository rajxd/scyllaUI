import React, { useState } from 'react';
import { api } from '../api';

export default function Setup({ onDone }) {
    const [form, setForm] = useState({ username: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) return setError('Passwords do not match');
        setLoading(true);
        try {
            await api.auth.setup({ username: form.username, password: form.password });
            onDone();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <span className="text-3xl">🪸</span>
                        <h1 className="text-2xl font-bold text-white">ScyllaUI</h1>
                    </div>
                    <p className="text-slate-400 text-sm">First-time setup — create your admin account</p>
                </div>
                <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
                    {error && <div className="bg-red-950/50 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
                        <input className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                            placeholder="admin" autoFocus required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                        <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="min 8 characters" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                        <input type="password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                            placeholder="repeat password" required />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                        {loading ? 'Setting up…' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
