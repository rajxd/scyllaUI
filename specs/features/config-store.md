# Config Store Spec

## Overview

All runtime state is stored in the `data/` directory as JSON files. No runtime database is needed. The `data/` directory is gitignored — users are responsible for backing it up.

---

## Files

### `data/config.json`
App configuration and admin credentials.

```json
{
  "username": "admin",
  "passwordHash": "$2b$12$...",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### `data/connections.json`
Array of saved ScyllaDB connection profiles. Passwords are encrypted.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Local Dev",
    "hosts": "127.0.0.1",
    "port": 9042,
    "datacenter": "datacenter1",
    "keyspace": "",
    "username": "cassandra",
    "password": "ab12cd34:ef56gh78:ij90kl12mn34",
    "ssl": false,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Store API (`src/config/store.js`)

### Functions

```js
readConfig()                   // → config object or {}
writeConfig(data)              // writes data/config.json atomically
readConnections()              // → array with passwords decrypted
writeConnections(connections)  // encrypts passwords, writes file
```

### Atomic Writes
- Write to `<file>.tmp` first, then `fs.renameSync` to target
- Prevents partial writes from corrupting config on crash

### Encryption

```
Key        = SHA-256(ENCRYPTION_KEY env var)  → 32 bytes
IV         = crypto.randomBytes(16)
Algorithm  = aes-256-gcm
Auth tag   = 16 bytes

Stored     = hex(IV) + ":" + hex(authTag) + ":" + hex(ciphertext)
```

If `ENCRYPTION_KEY` is missing, the server logs a CRITICAL error and exits with code 1.

---

## .gitignore entries

```
data/
*.env
.env
node_modules/
client/node_modules/
client/dist/
dist/
```

---

## Backup Guidance (README)

Users should back up the entire `data/` directory. If `data/config.json` is lost, they lose their admin credentials (re-run setup). If `data/connections.json` is lost, they lose saved connections (re-add them). Connection passwords are only recoverable if `ENCRYPTION_KEY` is known.
