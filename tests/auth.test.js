const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/store');
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('$2b$04$mocked-hash'),
    compare: jest.fn(),
}));

const store = require('../src/config/store');
const bcrypt = require('bcryptjs');
const authRouter = require('../src/routes/auth');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/auth/status', () => {
    test('returns configured: false when no passwordHash', async () => {
        store.readConfig.mockReturnValue({});
        const res = await request(buildApp()).get('/api/auth/status');
        expect(res.status).toBe(200);
        expect(res.body.configured).toBe(false);
    });

    test('returns configured: true when passwordHash exists', async () => {
        store.readConfig.mockReturnValue({ passwordHash: 'somehash' });
        const res = await request(buildApp()).get('/api/auth/status');
        expect(res.body.configured).toBe(true);
    });
});

describe('POST /api/auth/setup', () => {
    test('creates admin and writes config', async () => {
        store.readConfig.mockReturnValue({});
        store.writeConfig.mockReturnValue(undefined);

        const res = await request(buildApp())
            .post('/api/auth/setup')
            .send({ username: 'admin', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(store.writeConfig).toHaveBeenCalledWith(
            expect.objectContaining({ username: 'admin', passwordHash: '$2b$04$mocked-hash' })
        );
    });

    test('returns 409 if already configured', async () => {
        store.readConfig.mockReturnValue({ passwordHash: 'existing' });
        const res = await request(buildApp())
            .post('/api/auth/setup')
            .send({ username: 'admin', password: 'password123' });
        expect(res.status).toBe(409);
    });

    test('returns 400 for username too short', async () => {
        store.readConfig.mockReturnValue({});
        const res = await request(buildApp())
            .post('/api/auth/setup')
            .send({ username: 'ab', password: 'password123' });
        expect(res.status).toBe(400);
    });

    test('returns 400 for invalid username chars', async () => {
        store.readConfig.mockReturnValue({});
        const res = await request(buildApp())
            .post('/api/auth/setup')
            .send({ username: 'admin!', password: 'password123' });
        expect(res.status).toBe(400);
    });

    test('returns 400 for short password', async () => {
        store.readConfig.mockReturnValue({});
        const res = await request(buildApp())
            .post('/api/auth/setup')
            .send({ username: 'admin', password: 'short' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    test('returns JWT on valid credentials', async () => {
        store.readConfig.mockReturnValue({ username: 'admin', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(true);

        const res = await request(buildApp())
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();

        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(decoded.sub).toBe('admin');
    });

    test('returns 401 on wrong password', async () => {
        store.readConfig.mockReturnValue({ username: 'admin', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(buildApp())
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'wrong' });

        expect(res.status).toBe(401);
    });

    test('returns 401 on wrong username', async () => {
        store.readConfig.mockReturnValue({ username: 'admin', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(buildApp())
            .post('/api/auth/login')
            .send({ username: 'notadmin', password: 'password123' });

        expect(res.status).toBe(401);
    });

    test('returns 400 when not configured', async () => {
        store.readConfig.mockReturnValue({});
        const res = await request(buildApp())
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'password123' });
        expect(res.status).toBe(400);
    });
});
