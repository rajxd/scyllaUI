# Connections Feature Spec

## Overview

Users save one or more named ScyllaDB connection profiles. Passwords are AES-256-GCM encrypted before writing to `data/connections.json`. Connections are selected in the Explorer; the backend opens and caches a `cassandra.Client` per connection until the server restarts or the connection is explicitly disconnected.

---

## Data Model

```ts
interface Connection {
  id: string;           // UUID v4
  name: string;         // Display name, e.g. "Production cluster"
  hosts: string;        // Comma-separated, e.g. "10.0.0.1, 10.0.0.2"
  port: number;         // Default 9042
  datacenter: string;   // Local DC for load balancing, e.g. "datacenter1"
  keyspace?: string;    // Default keyspace (optional)
  username?: string;    // CQL auth username (optional)
  password?: string;    // Plaintext in memory, encrypted at rest
  ssl: boolean;         // Enable SSL/TLS
  createdAt: string;    // ISO timestamp
}
```

**At rest** (`data/connections.json`): `password` field stored as `iv:tag:ciphertext` hex string. All other fields stored plaintext.

---

## API Endpoints

All require JWT.

### `GET /api/connections`
- Returns array of connections **without** the `password` field (never send passwords to client)
- Returns `[]` if no connections saved

### `POST /api/connections`
- Body: Connection object (without `id`, `createdAt`)
- Validation:
  - `name`: required, 1–64 chars
  - `hosts`: required, at least one valid hostname/IP
  - `port`: 1–65535, default 9042
  - `datacenter`: required, default `"datacenter1"`
- Generates UUID `id`, sets `createdAt`
- Encrypts `password` before writing
- Returns created connection (without password)

### `PUT /api/connections/:id`
- Body: partial Connection fields
- Merges with existing; re-encrypts password if provided
- Returns updated connection (without password)
- 404 if not found

### `DELETE /api/connections/:id`
- Removes connection; disconnects active client pool if exists
- Returns `{ ok: true }`
- 404 if not found

### `POST /api/connections/:id/test`
- Reads connection (decrypts password), creates a temporary `cassandra.Client`, calls `client.connect()`, then `client.shutdown()`
- Returns `{ ok: true, message: "Connected successfully" }`
- Returns `{ ok: false, error: "<driver error message>" }` on failure (200 status, not 5xx, so UI can display error)
- Does **not** add to the pool

---

## Frontend Page: `/connections`

### Layout
- Header: "Connections" title + "Add Connection" button
- List of connection cards, each showing:
  - Name (bold)
  - Hosts + port
  - Keyspace (if set) or "no default keyspace" (dim)
  - SSL badge if enabled
  - Three buttons: **Connect** (primary), **Edit** (icon), **Delete** (icon, red confirm)

### Add / Edit Modal
- Fields:
  - Connection Name `*`
  - Hosts (comma-separated) `*`
  - Port (default 9042)
  - Datacenter (default `datacenter1`)
  - Default Keyspace (optional)
  - Username (optional)
  - Password (optional, masked input)
  - SSL toggle
- Footer: **Test Connection** button (calls `/test`, shows inline result) + **Save** button

### Connect button
- Calls `POST /api/explorer/connect/:id`
- On success: navigate to `/explorer?connection=<id>`

### Delete
- Confirmation: "Delete this connection? This cannot be undone."
- Calls `DELETE /api/connections/:id`

---

## Encryption Details

- Algorithm: AES-256-GCM
- Key derivation: `SHA-256(ENCRYPTION_KEY env var)` → 32-byte key
- IV: 16 random bytes per encryption
- Auth tag: 16 bytes (GCM default)
- Stored format: `<iv_hex>:<tag_hex>:<ciphertext_hex>`
- If `ENCRYPTION_KEY` is not set, server refuses to start
