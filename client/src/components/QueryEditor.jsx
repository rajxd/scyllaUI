import React, { useRef, useState } from 'react';
import { api } from '../api';

export default function QueryEditor({ connectionId }) {
    const [cql, setCql] = useState('SELECT * FROM system_schema.keyspaces LIMIT 20;');
    const [limit, setLimit] = useState(200);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const ref = useRef();

    const run = async () => {
        if (!cql.trim()) return;
        setLoading(true); setError(''); setResult(null);
        try {
            const r = await api.explorer.query(connectionId, cql, limit);
            if (r.error) setError(r.error);
            else setResult(r);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const onKey = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Editor */}
            <div className="shrink-0 p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <span className="text-white font-semibold text-sm">Query Editor</span>
                    <span className="text-slate-500 text-xs">Ctrl+Enter to run</span>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Limit</span>
                        <input type="number" value={limit} onChange={e => setLimit(e.target.value)}
                            className="w-20 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 focus:outline-none" />
                        <button onClick={run} disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                            {loading ? <><div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" /> Running…</> : '▶ Run'}
                        </button>
                    </div>
                </div>
                <textarea ref={ref} value={cql} onChange={e => setCql(e.target.value)} onKeyDown={onKey}
                    spellCheck={false}
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed scrollbar-thin"
                    placeholder="SELECT * FROM keyspace.table LIMIT 100;" />
            </div>

            {/* Errors */}
            {error && (
                <div className="mx-4 mb-3 bg-red-950/50 border border-red-800 text-red-400 text-xs rounded-xl px-4 py-2.5 font-mono">
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="flex-1 flex flex-col overflow-hidden border-t border-slate-800">
                    <div className="px-4 py-2 text-xs text-slate-500 shrink-0">
                        {result.count} row{result.count !== 1 ? 's' : ''} returned
                    </div>
                    <div className="flex-1 overflow-auto scrollbar-thin">
                        {result.columns.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">Query executed successfully (no result set)</div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 bg-slate-900 z-10">
                                    <tr>
                                        {result.columns.map(col => (
                                            <th key={col} className="px-4 py-2 text-left text-xs font-semibold text-slate-400 border-b border-slate-800 whitespace-nowrap">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, ri) => (
                                        <tr key={ri} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            {row.map((cell, ci) => (
                                                <td key={ci} className="px-4 py-2 font-mono text-xs whitespace-nowrap max-w-xs overflow-hidden text-ellipsis"
                                                    title={cell === null ? 'NULL' : String(cell)}>
                                                    {cell === null
                                                        ? <span className="text-slate-600 italic">NULL</span>
                                                        : <span className="text-slate-200">{String(cell).length > 100 ? String(cell).slice(0, 100) + '…' : String(cell)}</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {!result && !error && !loading && (
                <div className="flex-1 flex items-center justify-center text-slate-700 text-sm">
                    Run a query to see results
                </div>
            )}
        </div>
    );
}
