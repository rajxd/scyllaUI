import React, { useEffect, useState } from 'react';
import { api } from '../api';

const KIND_COLORS = {
    partition_key: 'bg-amber-900/40 text-amber-300',
    clustering:    'bg-indigo-900/40 text-indigo-300',
    regular:       'bg-slate-800 text-slate-300',
    static:        'bg-purple-900/40 text-purple-300',
};

export default function SchemaViewer({ connectionId, keyspace, table }) {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true); setError('');
        api.explorer.schema(connectionId, keyspace, table)
            .then(s => { setSchema(s); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [connectionId, keyspace, table]);

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" /></div>;
    if (error) return <div className="text-red-400 text-sm px-4 py-3 bg-red-950/30 rounded-xl m-4">{error}</div>;
    if (!schema) return null;

    const { columns, primaryKey, indexes, tableOptions } = schema;

    return (
        <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin h-full">
            {/* Primary key */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Key</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-slate-200">
                    ( {primaryKey.partitionKey.map(k => <span key={k} className="text-amber-400">{k}</span>).reduce((a, b) => [a, ', ', b], [])}
                    {primaryKey.clusteringKey.length > 0 && (
                        <>, {primaryKey.clusteringKey.map(k => <span key={k} className="text-indigo-400">{k}</span>).reduce((a, b) => [a, ', ', b], [])}</>
                    )} )
                </div>
            </div>

            {/* Columns */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Columns ({columns.length})</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/60">
                            <tr>
                                {['Name', 'Type', 'Kind'].map(h => (
                                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {columns.sort((a, b) => {
                                const order = { partition_key: 0, clustering: 1, static: 2, regular: 3 };
                                return (order[a.kind] ?? 3) - (order[b.kind] ?? 3) || a.position - b.position;
                            }).map(col => (
                                <tr key={col.name} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2 font-mono text-white">{col.name}</td>
                                    <td className="px-4 py-2 font-mono text-slate-400 text-xs">{col.type}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${KIND_COLORS[col.kind] || 'bg-slate-800 text-slate-400'}`}>
                                            {col.kind.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Indexes */}
            {indexes.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Indexes</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/60">
                                <tr>
                                    {['Name', 'Target'].map(h => (
                                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {indexes.map(idx => (
                                    <tr key={idx.name} className="border-t border-slate-800">
                                        <td className="px-4 py-2 font-mono text-white text-xs">{idx.name}</td>
                                        <td className="px-4 py-2 font-mono text-slate-400 text-xs">{idx.target}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Table options */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Table Options</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-400 space-y-1">
                    {tableOptions.comment && <div><span className="text-slate-500">comment: </span>{tableOptions.comment}</div>}
                    <div><span className="text-slate-500">gc_grace_seconds: </span>{tableOptions.gcGraceSeconds}</div>
                    <div><span className="text-slate-500">default_time_to_live: </span>{tableOptions.defaultTimeToLive}</div>
                </div>
            </div>
        </div>
    );
}
