jest.mock('fs');
const fs = require('fs');

// store.js has top-level code that checks existsSync — mock returns undefined (falsy) so mkdirSync is called (no-op)
const { readConfig, writeConfig, readConnections, writeConnections } = require('../src/config/store');

beforeEach(() => jest.clearAllMocks());

describe('readConfig / writeConfig', () => {
    test('returns {} when config file missing', () => {
        fs.existsSync.mockReturnValue(false);
        expect(readConfig()).toEqual({});
    });

    test('returns parsed config when file exists', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify({ username: 'admin', passwordHash: 'hash' }));
        expect(readConfig()).toEqual({ username: 'admin', passwordHash: 'hash' });
    });

    test('writeConfig performs atomic write', () => {
        fs.writeFileSync.mockReturnValue(undefined);
        fs.renameSync.mockReturnValue(undefined);
        writeConfig({ username: 'admin' });
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        expect(fs.renameSync).toHaveBeenCalledTimes(1);
    });
});

describe('writeConnections / readConnections', () => {
    test('encrypts passwords at rest', () => {
        let written;
        fs.writeFileSync.mockImplementation((_, data) => { written = data; });
        fs.renameSync.mockReturnValue(undefined);

        writeConnections([{ id: '1', name: 'test', hosts: 'localhost', password: 'secret123' }]);

        const stored = JSON.parse(written);
        expect(stored[0].password).not.toBe('secret123');
        expect(stored[0].password).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // iv:tag:ciphertext
    });

    test('decrypts passwords on read (round-trip)', () => {
        let written;
        fs.writeFileSync.mockImplementation((_, data) => { written = data; });
        fs.renameSync.mockReturnValue(undefined);

        writeConnections([{ id: '1', name: 'test', hosts: 'localhost', password: 'my-db-password' }]);

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(written);

        const result = readConnections();
        expect(result[0].password).toBe('my-db-password');
    });

    test('each encryption produces unique ciphertext (random IV)', () => {
        const encrypted = [];
        fs.writeFileSync.mockImplementation((_, data) => encrypted.push(JSON.parse(data)[0].password));
        fs.renameSync.mockReturnValue(undefined);

        writeConnections([{ id: '1', password: 'same' }]);
        writeConnections([{ id: '1', password: 'same' }]);

        expect(encrypted[0]).not.toBe(encrypted[1]);
    });

    test('returns [] when connections file missing', () => {
        fs.existsSync.mockReturnValue(false);
        expect(readConnections()).toEqual([]);
    });

    test('preserves empty password without encrypting', () => {
        let written;
        fs.writeFileSync.mockImplementation((_, data) => { written = data; });
        fs.renameSync.mockReturnValue(undefined);

        writeConnections([{ id: '1', name: 'test', password: '' }]);
        const stored = JSON.parse(written);
        expect(stored[0].password).toBe('');
    });
});
