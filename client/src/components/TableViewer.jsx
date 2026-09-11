import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';

const KIND_BADGE = {
    partition_key: 'bg-amber-900/50 text-amber-300 border border-amber-800',
    clustering:    'bg-indigo-900/50 text-indigo-300 border border-indigo-800',
};

export default function TableViewer({ connectionId, keyspace, table }) {
    const [data, setData] = useState(null);
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [limit, setLimit] = useState(100);
    const [pageStack, setPageStack] = useState([null]); // stack of pageStates; [0]=first page
    const [currentPage, setCurrentPage] = useState(0);

    const loadPage = useCallback(async (pageState, pg) => {
        setLoading(true); setError('');
        try {
            const [d, s] = await Promise.all([
                api.explorer.data(connectionId, keyspace, table, limit, pageState),
                schema ? Promise.resolve(schema) : api.explorer.schema(connectionId, keyspace, table),
            ]);
            setData(d);
            if (!schema) setSchema(s);
            setCurrentPage(pg);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [connectionId, keyspace, table, limit, schema]);

    useEffect(() => {
        setPageStack([null]);
        setCurrentPage(0);
        setSchema(null);
        loadPage(null, 0);
    }, [connectionId, keyspace, table, limit]);

    const next = () => {
        if (!data?.pageState) return;
        const next = [...pageStack, data.pageState];
        setPageStack(next);
        loadPage(data.pageState, currentPage + 1);
    };

    const prev = () => {
        if (currentPage === 0) return;
        const prevState = pageStack[currentPage - 1];
        setPageStack(s => s.slice(0, currentPage));
        loadPage(prevState, currentPage - 1);
    };

    const kindMap = {};
    if (schema) {
        schema.columns.forEach(c => { kindMap[c.name] = c.kind; });
    }

    if (loading && !data) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" /></div>;
    if (error) return <div className="text-red-400 text-sm px-4 py-3 bg-red-950/30 rounded-xl m-4">{error}</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
                <span className="text-slate-400 text-xs">Limit</span>
                <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                    {[50, 100, 250, 500].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={() => { setPageStack([null]); setCurrentPage(0); loadPage(null, 0); }}
                    className="text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1">
                    ↺ Refresh
                </button>
                {loading && <div className="animate-spin rounded-full h-3.5 w-3.5 border border-indigo-500 border-t-transparent ml-1" />}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-500">Page {currentPage + 1}</span>
                    <button onClick={prev} disabled={currentPage === 0}
                        className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg transition-colors">
                        ← Prev
                    </button>
                    <button onClick={next} disabled={!data?.hasMore}
                        className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg transition-colors">
                        Next →
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto scrollbar-thin">
                {data?.rows?.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-600">
                        <div className="text-center">
                            <div className="text-3xl mb-2">∅</div>
                            <p>Table is empty</p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                            <tr>
                                {(data?.columns || []).map(col => (
                                    <th key={col} className="px-4 py-2.5 text-left border-b border-slate-800 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-200 text-xs font-semibold">{col}</span>
                                            {KIND_BADGE[kindMap[col]] && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${KIND_BADGE[kindMap[col]]}`}>
                                                    {kindMap[col] === 'partition_key' ? 'PK' : 'CK'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.rows || []).map((row, ri) => (
                                <tr key={ri} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-4 py-2 font-mono text-xs whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                                            title={cell === null ? 'NULL' : String(cell)}>
                                            {cell === null
                                                ? <span className="text-slate-600 italic">NULL</span>
                                                : <span className="text-slate-200">{String(cell).length > 80 ? String(cell).slice(0, 80) + '…' : String(cell)}</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            {data && (
                <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500 shrink-0">
                    {data.count} rows on this page{data.hasMore ? ' · more available' : ' · end of data'}
                </div>
            )}
        </div>
    );
}
