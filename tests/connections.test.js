const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/store');
jest.mock('../src/scylla/manager');

const store = require('../src/config/store');
const manager = require('../src/scylla/manager');
const auth = require('../src/middleware/auth');
const connectionsRouter = require('../src/routes/connections');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/connections', auth, connectionsRouter);
    return app;
}

function token() {
    return `Bearer ${jwt.sign({ sub: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
}

const CONN = {
    id: 'conn-1',
    name: 'Local',
    hosts: '127.0.0.1',
    port: 9042,
    datacenter: 'datacenter1',
    keyspace: '',
    username: '',
    password: 'secret',
    ssl: false,
    createdAt: '2025-01-01T00:00:00.000Z',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/connections', () => {
    test('returns connections without password field', async () => {
        store.readConnections.mockReturnValue([CONN]);
        const res = await request(buildApp())
            .get('/api/connections')
            .set('Authorization', token());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].password).toBeUndefined();
        expect(res.body[0].name).toBe('Local');
    });

    test('returns 401 without token', async () => {
        const res = await request(buildApp()).get('/api/connections');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/connections', () => {
    test('creates and returns connection without password', async () => {
        store.readConnections.mockReturnValue([]);
        store.writeConnections.mockReturnValue(undefined);

        const res = await request(buildApp())
            .post('/api/connections')
            .set('Authorization', token())
            .send({ name: 'Test', hosts: '127.0.0.1', password: 'secret' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Test');
        expect(res.body.id).toBeDefined();
        expect(res.body.password).toBeUndefined();
        expect(store.writeConnections).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ name: 'Test', password: 'secret' })])
        );
    });

    test('returns 400 when name missing', async () => {
        const res = await request(buildApp())
            .post('/api/connections')
            .set('Authorization', token())
            .send({ hosts: '127.0.0.1' });
        expect(res.status).toBe(400);
    });

    test('returns 400 when hosts missing', async () => {
        const res = await request(buildApp())
            .post('/api/connections')
            .set('Authorization', token())
            .send({ name: 'Test' });
        expect(res.status).toBe(400);
    });
});

describe('PUT /api/connections/:id', () => {
    test('updates existing connection', async () => {
        store.readConnections.mockReturnValue([{ ...CONN }]);
        store.writeConnections.mockReturnValue(undefined);

        const res = await request(buildApp())
            .put('/api/connections/conn-1')
            .set('Authorization', token())
            .send({ name: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated');
        expect(res.body.password).toBeUndefined();
    });

    test('returns 404 for unknown id', async () => {
        store.readConnections.mockReturnValue([]);
        const res = await request(buildApp())
            .put('/api/connections/unknown')
            .set('Authorization', token())
            .send({ name: 'X' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/connections/:id', () => {
    test('deletes connection and calls disconnect', async () => {
        store.readConnections.mockReturnValue([{ ...CONN }]);
        store.writeConnections.mockReturnValue(undefined);
        manager.disconnect.mockResolvedValue(undefined);

        const res = await request(buildApp())
            .delete('/api/connections/conn-1')
            .set('Authorization', token());

        expect(res.status).toBe(200);
        expect(manager.disconnect).toHaveBeenCalledWith('conn-1');
        expect(store.writeConnections).toHaveBeenCalledWith([]);
    });

    test('returns 404 for unknown id', async () => {
        store.readConnections.mockReturnValue([]);
        const res = await request(buildApp())
            .delete('/api/connections/unknown')
            .set('Authorization', token());
        expect(res.status).toBe(404);
    });
});

describe('POST /api/connections/:id/test', () => {
    test('returns ok: true on successful connection', async () => {
        store.readConnections.mockReturnValue([{ ...CONN }]);
        manager.testConnection.mockResolvedValue(undefined);

        const res = await request(buildApp())
            .post('/api/connections/conn-1/test')
            .set('Authorization', token());

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    test('returns ok: false when connection fails', async () => {
        store.readConnections.mockReturnValue([{ ...CONN }]);
        manager.testConnection.mockRejectedValue(new Error('Connection refused'));

        const res = await request(buildApp())
            .post('/api/connections/conn-1/test')
            .set('Authorization', token());

        expect(res.body.ok).toBe(false);
        expect(res.body.error).toBe('Connection refused');
    });
});
