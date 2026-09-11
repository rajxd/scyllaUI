const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readConnections, writeConnections } = require('../config/store');
const { disconnect, testConnection } = require('../scylla/manager');

const router = express.Router();

const strip = c => { const { password, ...rest } = c; return rest; };

router.get('/', (req, res) => {
    res.json(readConnections().map(strip));
});

router.post('/', (req, res) => {
    const { name, hosts, port, datacenter, keyspace, username, password, ssl } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!hosts || !hosts.trim()) return res.status(400).json({ error: 'hosts is required' });

    const conn = {
        id: uuidv4(),
        name: name.trim(),
        hosts: hosts.trim(),
        port: port ? Number(port) : 9042,
        datacenter: datacenter || 'datacenter1',
        keyspace: keyspace || '',
        username: username || '',
        password: password || '',
        ssl: !!ssl,
        createdAt: new Date().toISOString(),
    };
    const all = readConnections();
    all.push(conn);
    writeConnections(all);
    res.status(201).json(strip(conn));
});

router.put('/:id', (req, res) => {
    const all = readConnections();
    const idx = all.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const { name, hosts, port, datacenter, keyspace, username, password, ssl } = req.body;
    const updated = {
        ...all[idx],
        ...(name !== undefined && { name }),
        ...(hosts !== undefined && { hosts }),
        ...(port !== undefined && { port: Number(port) }),
        ...(datacenter !== undefined && { datacenter }),
        ...(keyspace !== undefined && { keyspace }),
        ...(username !== undefined && { username }),
        ...(password !== undefined && { password }),
        ...(ssl !== undefined && { ssl: !!ssl }),
    };
    all[idx] = updated;
    writeConnections(all);
    res.json(strip(updated));
});

router.delete('/:id', async (req, res) => {
    const all = readConnections();
    const idx = all.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    await disconnect(req.params.id);
    all.splice(idx, 1);
    writeConnections(all);
    res.json({ ok: true });
});

router.post('/:id/test', async (req, res) => {
    const all = readConnections();
    const conn = all.find(c => c.id === req.params.id);
    if (!conn) return res.status(404).json({ error: 'Not found' });
    try {
        await testConnection(conn);
        res.json({ ok: true, message: 'Connected successfully' });
    } catch (err) {
        res.json({ ok: false, error: err.message });
    }
});

module.exports = router;
