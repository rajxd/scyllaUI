const cassandra = require('cassandra-driver');

const pool = new Map(); // connectionId → cassandra.Client

async function getClient(conn) {
    if (pool.has(conn.id)) return pool.get(conn.id);

    const opts = {
        contactPoints: conn.hosts.split(',').map(h => h.trim()),
        localDataCenter: conn.datacenter || 'datacenter1',
        socketOptions: { port: conn.port || 9042 },
    };
    if (conn.username) {
        opts.credentials = { username: conn.username, password: conn.password };
    }
    if (conn.keyspace) {
        opts.keyspace = conn.keyspace;
    }
    if (conn.ssl) {
        opts.sslOptions = { rejectUnauthorized: true };
    }

    const client = new cassandra.Client(opts);
    await client.connect();
    pool.set(conn.id, client);
    return client;
}

async function disconnect(id) {
    if (pool.has(id)) {
        try { await pool.get(id).shutdown(); } catch (_) {}
        pool.delete(id);
    }
}

async function testConnection(conn) {
    const opts = {
        contactPoints: conn.hosts.split(',').map(h => h.trim()),
        localDataCenter: conn.datacenter || 'datacenter1',
        socketOptions: { port: conn.port || 9042, connectTimeout: 8000 },
    };
    if (conn.username) opts.credentials = { username: conn.username, password: conn.password };
    if (conn.ssl) opts.sslOptions = { rejectUnauthorized: true };

    const client = new cassandra.Client(opts);
    await client.connect();
    await client.shutdown();
}

module.exports = { getClient, disconnect, testConnection };
