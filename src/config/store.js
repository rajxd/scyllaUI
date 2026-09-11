const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

if (!process.env.ENCRYPTION_KEY) {
    console.error('CRITICAL: ENCRYPTION_KEY env var is not set. Server cannot start safely.');
    process.exit(1);
}

function encryptionKey() {
    return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
}

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(stored) {
    const [ivHex, tagHex, encHex] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}

function atomicWrite(file, data) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
}

function readConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function writeConfig(data) {
    atomicWrite(CONFIG_FILE, data);
}

function readConnections() {
    if (!fs.existsSync(CONNECTIONS_FILE)) return [];
    const rows = JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
    return rows.map(c => ({
        ...c,
        password: c.password ? decrypt(c.password) : '',
    }));
}

function writeConnections(connections) {
    const encrypted = connections.map(c => ({
        ...c,
        password: c.password ? encrypt(c.password) : '',
    }));
    atomicWrite(CONNECTIONS_FILE, encrypted);
}

module.exports = { readConfig, writeConfig, readConnections, writeConnections };
