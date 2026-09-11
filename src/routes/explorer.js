const express = require('express');
const { readConnections } = require('../config/store');
const { getClient, disconnect } = require('../scylla/manager');

const router = express.Router();

const SYSTEM_KEYSPACES = new Set([
    'system', 'system_auth', 'system_distributed',
    'system_traces', 'system_schema', 'system_virtual_schema',
]);

const DDL_PATTERN = /^\s*(drop|truncate|alter|create\s+table|create\s+keyspace)\s/i;

function getConn(id) {
    const conn = readConnections().find(c => c.id === id);
    if (!conn) throw Object.assign(new Error('Connection not found'), { status: 404 });
    return conn;
}

function serializeValue(val) {
    if (val === null || val === undefined) return null;
    if (val instanceof Buffer) return '<binary ' + val.length + ' bytes>';
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'object' && typeof val.toString === 'function' && val.constructor?.name !== 'Object') {
        return val.toString(); // handles Long, UUID, etc.
    }
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
}

router.post('/connect/:id', async (req, res) => {
    try {
        const conn = getConn(req.params.id);
        await getClient(conn);
        res.json({ ok: true, connectionId: conn.id, name: conn.name });
    } catch (err) {
        res.status(err.status || 500).json({ ok: false, error: err.message });
    }
});

router.post('/disconnect/:id', async (req, res) => {
    await disconnect(req.params.id);
    res.json({ ok: true });
});

router.get('/keyspaces', async (req, res) => {
    try {
        const conn = getConn(req.query.connection);
        const client = await getClient(conn);
        const result = await client.execute(
            'SELECT keyspace_name, replication FROM system_schema.keyspaces'
        );
        const keyspaces = result.rows
            .filter(r => !SYSTEM_KEYSPACES.has(r.keyspace_name))
            .map(r => ({
                name: r.keyspace_name,
                replication: r.replication ? Object.fromEntries(r.replication) : {},
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(keyspaces);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/keyspaces/:ks/tables', async (req, res) => {
    try {
        const conn = getConn(req.query.connection);
        const client = await getClient(conn);
        const result = await client.execute(
            'SELECT table_name, comment, gc_grace_seconds FROM system_schema.tables WHERE keyspace_name = ?',
            [req.params.ks], { prepare: true }
        );
        const tables = result.rows
            .map(r => ({
                name: r.table_name,
                comment: r.comment || '',
                gcGraceSeconds: r.gc_grace_seconds,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(tables);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/keyspaces/:ks/tables/:table/schema', async (req, res) => {
    try {
        const conn = getConn(req.query.connection);
        const client = await getClient(conn);
        const { ks, table } = req.params;

        const [colResult, idxResult, tblResult] = await Promise.all([
            client.execute(
                'SELECT column_name, type, kind, position FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?',
                [ks, table], { prepare: true }
            ),
            client.execute(
                'SELECT index_name, options FROM system_schema.indexes WHERE keyspace_name = ? AND table_name = ?',
                [ks, table], { prepare: true }
            ),
            client.execute(
                'SELECT comment, gc_grace_seconds, default_time_to_live, compaction, compression FROM system_schema.tables WHERE keyspace_name = ? AND table_name = ?',
                [ks, table], { prepare: true }
            ),
        ]);

        const columns = colResult.rows.map(r => ({
            name: r.column_name,
            type: r.type,
            kind: r.kind,
            position: r.position,
        }));

        const pkCols = columns.filter(c => c.kind === 'partition_key').sort((a, b) => a.position - b.position);
        const ckCols = columns.filter(c => c.kind === 'clustering').sort((a, b) => a.position - b.position);

        const indexes = idxResult.rows.map(r => ({
            name: r.index_name,
            target: r.options ? (Object.fromEntries(r.options).target || '') : '',
        }));

        const tbl = tblResult.rows[0] || {};
        const tableOptions = {
            comment: tbl.comment || '',
            gcGraceSeconds: tbl.gc_grace_seconds,
            defaultTimeToLive: tbl.default_time_to_live,
            compaction: tbl.compaction ? Object.fromEntries(tbl.compaction) : {},
            compression: tbl.compression ? Object.fromEntries(tbl.compression) : {},
        };

        res.json({
            columns,
            primaryKey: {
                partitionKey: pkCols.map(c => c.name),
                clusteringKey: ckCols.map(c => c.name),
            },
            indexes,
            tableOptions,
        });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/keyspaces/:ks/tables/:table/data', async (req, res) => {
    try {
        const conn = getConn(req.query.connection);
        const client = await getClient(conn);
        const { ks, table } = req.params;
        const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 100));
        const pageState = req.query.pageState || undefined;

        const result = await client.execute(
            `SELECT * FROM "${ks}"."${table}"`,
            [],
            { prepare: true, fetchSize: limit, pageState }
        );

        const columns = result.columns ? result.columns.map(c => c.name) : [];
        const rows = result.rows.map(row => columns.map(col => serializeValue(row[col])));

        res.json({
            columns,
            rows,
            pageState: result.pageState ? result.pageState.toString('base64') : null,
            hasMore: !!result.pageState,
            count: rows.length,
        });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.post('/query', async (req, res) => {
    try {
        const conn = getConn(req.query.connection);
        const { cql, limit = 200 } = req.body;
        if (!cql || !cql.trim()) return res.status(400).json({ error: 'cql is required' });

        const allowDDL = process.env.ALLOW_DDL === 'true';
        if (!allowDDL && DDL_PATTERN.test(cql.trim())) {
            return res.status(403).json({ error: 'DDL/destructive statements are not allowed. Set ALLOW_DDL=true to enable.' });
        }

        const client = await getClient(conn);
        const cappedLimit = Math.min(2000, Math.max(1, parseInt(limit) || 200));

        let finalCql = cql.trim();
        const isSelect = /^\s*select\s/i.test(finalCql);
        if (isSelect && !/\blimit\s+\d+/i.test(finalCql)) {
            finalCql = finalCql.replace(/;*$/, '') + ` LIMIT ${cappedLimit}`;
        }

        const result = await client.execute(finalCql, [], { prepare: false, fetchSize: cappedLimit });

        const columns = result.columns ? result.columns.map(c => c.name) : [];
        const rows = (result.rows || []).map(row => columns.map(col => serializeValue(row[col])));

        res.json({ columns, rows, count: rows.length, hasMore: false, pageState: null });
    } catch (err) {
        res.json({ error: err.message, columns: [], rows: [], count: 0 });
    }
});

module.exports = router;
