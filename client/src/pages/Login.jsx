import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { token } = await api.auth.login(form);
            localStorage.setItem('scyllaui_token', token);
            navigate('/connections');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <span className="text-3xl">🪸</span>
                        <h1 className="text-2xl font-bold text-white">ScyllaUI</h1>
                    </div>
                    <p className="text-slate-500 text-sm">ScyllaDB web client</p>
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
                            placeholder="••••••••" required />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-slate-600 text-xs mt-6">ScyllaUI — Open Source — Apache 2.0</p>
            </div>
        </div>
    );
}
