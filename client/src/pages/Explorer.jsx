import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Sidebar from '../components/Sidebar';
import TableViewer from '../components/TableViewer';
import SchemaViewer from '../components/SchemaViewer';
import QueryEditor from '../components/QueryEditor';

export default function Explorer() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const connectionId = params.get('connection');

    const [connName, setConnName] = useState('');
    const [connections, setConnections] = useState([]);
    const [activeTable, setActiveTable] = useState(null); // { keyspace, table }
    const [mode, setMode] = useState('table'); // 'table' | 'query'
    const [tab, setTab] = useState('data'); // 'data' | 'schema'
    const [error, setError] = useState('');

    useEffect(() => {
        if (!connectionId) { navigate('/connections'); return; }
        Promise.all([api.connections.list(), api.explorer.connect(connectionId)])
            .then(([conns, conn]) => {
                setConnections(conns);
                setConnName(conn.name || connectionId);
            })
            .catch(e => setError(e.message));
    }, [connectionId]);

    const switchConnection = async (id) => {
        await api.explorer.connect(id);
        navigate(`/explorer?connection=${id}`);
    };

    const logout = () => { localStorage.removeItem('scyllaui_token'); navigate('/login'); };

    const selectTable = (t) => { setActiveTable(t); setMode('table'); setTab('data'); };

    return (
        <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
            {/* Header */}
            <header className="h-12 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 shrink-0 gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg">🪸</span>
                    <span className="font-bold text-white text-sm hidden sm:block">ScyllaUI</span>
                </div>

                {/* Connection selector */}
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <select value={connectionId} onChange={e => switchConnection(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none truncate">
                        {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => navigate('/connections')} className="text-slate-400 hover:text-white text-xs transition-colors">Connections</button>
                    <button onClick={logout} className="text-slate-400 hover:text-white text-xs transition-colors">Sign out</button>
                </div>
            </header>

            {error && (
                <div className="bg-red-950/50 border-b border-red-900 text-red-400 text-xs px-4 py-2 flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')} className="text-red-600 hover:text-red-400 ml-4">✕</button>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden shrink-0">
                    <Sidebar
                        connectionId={connectionId}
                        activeTable={activeTable}
                        onSelectTable={selectTable}
                        onQueryMode={() => setMode('query')}
                    />
                </aside>

                {/* Main content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {mode === 'query' ? (
                        <>
                            <div className="px-4 py-2.5 border-b border-slate-800 shrink-0 flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">Query Editor</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <QueryEditor connectionId={connectionId} />
                            </div>
                        </>
                    ) : activeTable ? (
                        <>
                            {/* Table header + tabs */}
                            <div className="px-4 py-2.5 border-b border-slate-800 shrink-0 flex items-center gap-3">
                                <span className="text-xs text-slate-500">{activeTable.keyspace}</span>
                                <span className="text-slate-700">/</span>
                                <span className="text-sm font-semibold text-white">{activeTable.table}</span>
                                <div className="ml-auto flex bg-slate-800 rounded-lg p-0.5">
                                    {['data', 'schema'].map(t => (
                                        <button key={t} onClick={() => setTab(t)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                {tab === 'data'
                                    ? <TableViewer connectionId={connectionId} keyspace={activeTable.keyspace} table={activeTable.table} />
                                    : <SchemaViewer connectionId={connectionId} keyspace={activeTable.keyspace} table={activeTable.table} />}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-700">
                            <div className="text-center">
                                <div className="text-5xl mb-3">🪸</div>
                                <p className="text-slate-500">Select a table from the sidebar or open the Query Editor</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
