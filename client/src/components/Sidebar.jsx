import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Sidebar({ connectionId, onSelectTable, onQueryMode, activeTable }) {
    const [keyspaces, setKeyspaces] = useState([]);
    const [tables, setTables] = useState({});
    const [expanded, setExpanded] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!connectionId) return;
        api.explorer.keyspaces(connectionId).then(ks => {
            setKeyspaces(ks);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [connectionId]);

    const toggleKeyspace = async (ks) => {
        const next = !expanded[ks];
        setExpanded(e => ({ ...e, [ks]: next }));
        if (next && !tables[ks]) {
            const tbls = await api.explorer.tables(connectionId, ks);
            setTables(t => ({ ...t, [ks]: tbls }));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <button onClick={onQueryMode}
                className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">
                <span className="text-base">⌨</span> Query Editor
            </button>
            <div className="px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Keyspaces</div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {keyspaces.length === 0 && (
                    <p className="text-slate-600 text-xs px-4 py-3">No user keyspaces found</p>
                )}
                {keyspaces.map(ks => (
                    <div key={ks.name}>
                        <button onClick={() => toggleKeyspace(ks.name)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left">
                            <span className="text-slate-500 text-xs">{expanded[ks.name] ? '▼' : '▶'}</span>
                            <span className="font-medium truncate">{ks.name}</span>
                        </button>
                        {expanded[ks.name] && (
                            <div className="ml-5 border-l border-slate-800">
                                {!tables[ks.name] ? (
                                    <div className="px-3 py-1">
                                        <div className="animate-spin rounded-full h-3 w-3 border border-indigo-500 border-t-transparent" />
                                    </div>
                                ) : tables[ks.name].length === 0 ? (
                                    <p className="text-slate-600 text-xs px-3 py-1">no tables</p>
                                ) : tables[ks.name].map(t => (
                                    <button key={t.name}
                                        onClick={() => onSelectTable({ keyspace: ks.name, table: t.name })}
                                        className={`w-full text-left px-3 py-1.5 text-xs truncate transition-colors ${
                                            activeTable?.keyspace === ks.name && activeTable?.table === t.name
                                                ? 'text-indigo-400 bg-indigo-900/20'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
