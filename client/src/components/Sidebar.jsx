import React, { useEffect, useState } from 'react';
import { api } from '../api';

function KeyspaceIcon({ open }) {
    return (
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

function DbIcon() {
    return (
        <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
            <path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" />
        </svg>
    );
}

function TableIcon({ active }) {
    return (
        <svg className={`w-3 h-3 shrink-0 ${active ? 'text-indigo-400' : 'text-slate-500'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M3 15h18M9 3v18" />
        </svg>
    );
}

export default function Sidebar({ connectionId, onSelectTable, onQueryMode, activeTable }) {
    const [keyspaces, setKeyspaces] = useState([]);
    const [tables, setTables] = useState({});
    const [expanded, setExpanded] = useState({});
    const [loadingKs, setLoadingKs] = useState(true);
    const [loadingTbl, setLoadingTbl] = useState({});
    const [ksError, setKsError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!connectionId) return;
        setLoadingKs(true);
        api.explorer.keyspaces(connectionId)
            .then(ks => setKeyspaces(ks))
            .catch(e => setKsError(e.message))
            .finally(() => setLoadingKs(false));
    }, [connectionId]);

    const toggleKeyspace = async (ks) => {
        const next = !expanded[ks];
        setExpanded(e => ({ ...e, [ks]: next }));
        if (next && !tables[ks]) {
            setLoadingTbl(l => ({ ...l, [ks]: true }));
            try {
                const tbls = await api.explorer.tables(connectionId, ks);
                setTables(t => ({ ...t, [ks]: tbls }));
            } finally {
                setLoadingTbl(l => ({ ...l, [ks]: false }));
            }
        }
    };

    const filtered = search.trim().toLowerCase();
    const visibleKeyspaces = keyspaces.filter(ks =>
        !filtered || ks.name.includes(filtered) ||
        (tables[ks.name] || []).some(t => t.name.includes(filtered))
    );

    return (
        <div className="flex flex-col h-full bg-slate-950">
            {/* Search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter…"
                        className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                    />
                </div>
            </div>

            {/* Query Editor button */}
            <div className="px-3 pb-2 shrink-0">
                <button onClick={onQueryMode}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium border border-slate-800 hover:border-slate-700">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Query Editor
                </button>
            </div>

            <div className="px-3 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest shrink-0">
                Keyspaces
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto">
                {loadingKs ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-slate-500 text-xs">
                        <div className="animate-spin rounded-full h-3 w-3 border border-indigo-500 border-t-transparent" />
                        Loading…
                    </div>
                ) : ksError ? (
                    <p className="text-red-400 text-xs px-4 py-3 break-words">{ksError}</p>
                ) : visibleKeyspaces.length === 0 ? (
                    <p className="text-slate-600 text-xs px-4 py-3">
                        {filtered ? 'No matches' : 'No user keyspaces found'}
                    </p>
                ) : visibleKeyspaces.map(ks => {
                    const isOpen = expanded[ks.name];
                    const tblList = tables[ks.name] || [];
                    const visibleTables = filtered
                        ? tblList.filter(t => t.name.includes(filtered) || ks.name.includes(filtered))
                        : tblList;

                    return (
                        <div key={ks.name}>
                            {/* Keyspace row */}
                            <button
                                onClick={() => toggleKeyspace(ks.name)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors group">
                                <KeyspaceIcon open={isOpen} />
                                <DbIcon />
                                <span className="flex-1 text-xs font-semibold text-slate-200 truncate">{ks.name}</span>
                                {tables[ks.name] && (
                                    <span className="text-[10px] text-slate-600 group-hover:text-slate-500 shrink-0">
                                        {tables[ks.name].length}
                                    </span>
                                )}
                            </button>

                            {/* Tables */}
                            {isOpen && (
                                <div className="ml-4 border-l border-slate-800/80">
                                    {loadingTbl[ks.name] ? (
                                        <div className="flex items-center gap-2 px-4 py-2 text-slate-500 text-xs">
                                            <div className="animate-spin rounded-full h-3 w-3 border border-indigo-500 border-t-transparent" />
                                        </div>
                                    ) : visibleTables.length === 0 ? (
                                        <p className="text-slate-600 text-xs px-4 py-1.5">no tables</p>
                                    ) : visibleTables.map(t => {
                                        const isActive = activeTable?.keyspace === ks.name && activeTable?.table === t.name;
                                        return (
                                            <button key={t.name}
                                                onClick={() => onSelectTable({ keyspace: ks.name, table: t.name })}
                                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                                                    isActive
                                                        ? 'bg-indigo-900/30 text-indigo-300'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                                }`}>
                                                <TableIcon active={isActive} />
                                                <span className="text-xs truncate">{t.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
