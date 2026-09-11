# 🪸 ScyllaUI

Open-source web client for **ScyllaDB** (and Apache Cassandra). Browse keyspaces, inspect table schemas, page through data, and run ad-hoc CQL queries — all from a browser.

> **License:** Apache 2.0 · **Status:** Alpha

---

## Features

- 🔌 **Multiple connections** — save and switch between clusters; credentials encrypted at rest (AES-256-GCM)
- 🗂 **Keyspace & table browser** — expandable sidebar tree
- 📋 **Table data viewer** — paginated rows using ScyllaDB's native token paging, column type badges (PK / CK)
- 🔍 **Schema viewer** — columns, primary key layout, indexes, table options
- ⌨ **CQL query editor** — Ctrl+Enter to run; DDL blocked by default
- 🔒 **Single admin user** — bcrypt-hashed password, JWT sessions (24 h)

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/rajxd/scyllaUI.git
cd scyllaUI
cp .env.example .env
# Edit .env — set JWT_SECRET and ENCRYPTION_KEY to random strings
```

### 2. Install & build

```bash
npm run setup          # installs server deps + builds React frontend
```

### 3. Run

```bash
npm start              # http://localhost:3000
```

First visit walks you through creating an admin account.

---

## Development

```bash
npm install
cd client && npm install && cd ..
cp .env.example .env   # edit as needed

# Terminal 1 — backend with hot-reload
npm run dev:server

# Terminal 2 — Vite dev server with HMR
npm run dev:client
```

Frontend dev server: `http://localhost:5173` (proxies `/api` to `:3000`)

---

## Configuration (`.env`)

| Variable         | Required | Default | Description                              |
|------------------|----------|---------|------------------------------------------|
| `JWT_SECRET`     | ✅        | —       | Signs JWT tokens; use a long random string |
| `ENCRYPTION_KEY` | ✅        | —       | Derives AES-256 key for credential encryption |
| `PORT`           | —        | `3000`  | HTTP server port                         |
| `ALLOW_DDL`      | —        | `false` | Set `true` to allow DROP/ALTER/TRUNCATE in the query editor |
| `CORS_ORIGIN`    | —        | `http://localhost:5173` | Allowed origin in dev mode |

---

## Data Storage

All runtime data is stored in `data/` (gitignored):

| File                    | Contents                          |
|-------------------------|-----------------------------------|
| `data/config.json`      | Admin username + bcrypt hash      |
| `data/connections.json` | Saved connections (passwords AES-encrypted) |

**Back up `data/` and your `ENCRYPTION_KEY` — losing either means losing access to saved connections.**

---

## Security Notes

- Connection passwords are never sent to the browser after saving
- DDL statements (`DROP`, `TRUNCATE`, `ALTER`) blocked in query editor by default
- JWT expires after 24 hours
- Set strong random values for `JWT_SECRET` and `ENCRYPTION_KEY` in production

---

## Roadmap

- [ ] Query history (session)
- [ ] Export table data as CSV / JSON
- [ ] Multiple user accounts
- [ ] Dark/light theme toggle
- [ ] Connection import/export

---

## Contributing

PRs welcome. Please open an issue first for large changes.

```bash
npm run setup   # first-time setup
npm run dev     # start both servers concurrently
```

---

## License

[Apache 2.0](LICENSE) © 2025 ScyllaUI Contributors
