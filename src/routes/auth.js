const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readConfig, writeConfig } = require('../config/store');

const router = express.Router();

router.get('/status', (req, res) => {
    const cfg = readConfig();
    res.json({ configured: !!cfg.passwordHash });
});

router.post('/setup', async (req, res) => {
    const cfg = readConfig();
    if (cfg.passwordHash) return res.status(409).json({ error: 'Already configured' });

    const { username, password } = req.body;
    if (!username || !/^[a-zA-Z0-9_]{3,32}$/.test(username))
        return res.status(400).json({ error: 'Username must be 3–32 alphanumeric/underscore chars' });
    if (!password || password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const passwordHash = await bcrypt.hash(password, 12);
    writeConfig({ username, passwordHash, createdAt: new Date().toISOString() });
    res.json({ ok: true });
});

router.post('/login', async (req, res) => {
    const cfg = readConfig();
    if (!cfg.passwordHash) return res.status(400).json({ error: 'App not configured yet' });

    const { username, password } = req.body;
    const match = username === cfg.username && await bcrypt.compare(password, cfg.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

module.exports = router;
