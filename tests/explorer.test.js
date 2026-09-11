const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/store');
jest.mock('../src/scylla/manager');

const store = require('../src/config/store');
const manager = require('../src/scylla/manager');
const auth = require('../src/middleware/auth');
const explorerRouter = require('../src/routes/explorer');

const mockClient = { execute: jest.fn() };

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/explorer', auth, explorerRouter);
    return app;
}

function token() {
    return `Bearer ${jwt.sign({ sub: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
}

const CONN = { id: 'conn-1', name: 'Local', hosts: '127.0.0.1', port: 9042, datacenter: 'datacenter1' };

beforeEach(() => {
    jest.clearAllMocks();
    store.readConnections.mockReturnValue([CONN]);
    manager.getClient.mockResolvedValue(mockClient);
});

describe('POST /api/explorer/connect/:id', () => {
    test('connects and returns connection info', async () => {
        const res = await request(buildApp())
            .post('/api/explorer/connect/conn-1')
            .set('Authorization', token());
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.name).toBe('Local');
    });

    test('returns 404 for unknown connection', async () => {
        store.readConnections.mockReturnValue([]);
        const res = await request(buildApp())
            .post('/api/explorer/connect/unknown')
            .set('Authorization', token());
        expect(res.status).toBe(404);
    });
});

describe('GET /api/explorer/keyspaces', () => {
    test('filters out system keyspaces', async () => {
        mockClient.execute.mockResolvedValue({
            rows: [
                { keyspace_name: 'my_app', replication: { class: 'SimpleStrategy' } },
                { keyspace_name: 'system', replication: {} },
                { keyspace_name: 'system_auth', replication: {} },
                { keyspace_name: 'system_schema', replication: {} },
            ],
        });

        const res = await request(buildApp())
            .get('/api/explorer/keyspaces?connection=conn-1')
            .set('Authorization', token());

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].name).toBe('my_app');
    });

    test('returns sorted keyspace list', async () => {
        mockClient.execute.mockResolvedValue({
            rows: [
                { keyspace_name: 'zebra_ks', replication: {} },
                { keyspace_name: 'alpha_ks', replication: {} },
            ],
        });

        const res = await request(buildApp())
            .get('/api/explorer/keyspaces?connection=conn-1')
            .set('Authorization', token());

        expect(res.body[0].name).toBe('alpha_ks');
        expect(res.body[1].name).toBe('zebra_ks');
    });

    test('returns 401 without token', async () => {
        const res = await request(buildApp()).get('/api/explorer/keyspaces?connection=conn-1');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/explorer/keyspaces/:ks/tables', () => {
    test('returns table list sorted by name', async () => {
        mockClient.execute.mockResolvedValue({
            rows: [
                { table_name: 'users', comment: '', gc_grace_seconds: 864000 },
                { table_name: 'accounts', comment: '', gc_grace_seconds: 864000 },
            ],
        });

        const res = await request(buildApp())
            .get('/api/explorer/keyspaces/my_app/tables?connection=conn-1')
            .set('Authorization', token());

        expect(res.status).toBe(200);
        expect(res.body[0].name).toBe('accounts');
        expect(res.body[1].name).toBe('users');
    });
});

describe('POST /api/explorer/query', () => {
    test('executes SELECT and returns rows', async () => {
        mockClient.execute.mockResolvedValue({
            columns: [{ name: 'id' }, { name: 'email' }],
            rows: [{ id: '1', email: 'a@b.com' }],
            pageState: null,
        });

        const res = await request(buildApp())
            .post('/api/explorer/query?connection=conn-1')
            .set('Authorization', token())
            .send({ cql: 'SELECT * FROM users' });

        expect(res.status).toBe(200);
        expect(res.body.columns).toEqual(['id', 'email']);
        expect(res.body.rows).toHaveLength(1);
    });

    test('blocks DDL statements by default', async () => {
        const ddlStatements = [
            'DROP TABLE users',
            'TRUNCATE users',
            'ALTER TABLE users ADD col text',
        ];

        for (const cql of ddlStatements) {
            const res = await request(buildApp())
                .post('/api/explorer/query?connection=conn-1')
                .set('Authorization', token())
                .send({ cql });
            expect(res.body.error).toMatch(/not allowed/i);
        }
    });

    test('allows DDL when ALLOW_DDL=true', async () => {
        process.env.ALLOW_DDL = 'true';
        mockClient.execute.mockResolvedValue({ columns: [], rows: [] });

        const res = await request(buildApp())
            .post('/api/explorer/query?connection=conn-1')
            .set('Authorization', token())
            .send({ cql: 'DROP TABLE IF EXISTS old_table' });

        expect(res.body.error).toBeUndefined();
        delete process.env.ALLOW_DDL;
    });

    test('auto-appends LIMIT to SELECT without one', async () => {
        mockClient.execute.mockResolvedValue({ columns: [], rows: [] });

        await request(buildApp())
            .post('/api/explorer/query?connection=conn-1')
            .set('Authorization', token())
            .send({ cql: 'SELECT * FROM users', limit: 50 });

        const calledCql = mockClient.execute.mock.calls[0][0];
        expect(calledCql).toMatch(/LIMIT 50/i);
    });

    test('returns 400 for empty cql', async () => {
        const res = await request(buildApp())
            .post('/api/explorer/query?connection=conn-1')
            .set('Authorization', token())
            .send({ cql: '   ' });
        expect(res.status).toBe(400);
    });
});
