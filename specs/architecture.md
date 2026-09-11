# ScyllaUI — Architecture Spec

## Overview

ScyllaUI is a self-hosted, open-source web client for ScyllaDB. It lets a team browse keyspaces/tables, view and paginate data, inspect schemas, and run ad-hoc CQL queries — all from a browser, with no client-side ScyllaDB driver needed.

## Goals

- Zero-dependency install: `npm install && npm run build && npm start`
- Single admin user (no multi-user management)
- Multiple saved ScyllaDB connections, credentials stored encrypted on disk
- Stateless backend — ScyllaDB connections pooled in memory, re-opened on server restart
- Works against ScyllaDB 5.x and Apache Cassandra 4.x (cassandra-driver compatible)

## Non-goals

- Not a migration tool, no schema DDL write operations
- No query history persistence (session-only)
- No multi-tenancy

---

## Stack

| Layer      | Technology                             | Reason                          |
|------------|----------------------------------------|---------------------------------|
| Backend    | Node.js 20 + Express 4                 | Lightweight, ecosystem fit      |
| DB driver  | `cassandra-driver` 4.x                 | Official ScyllaDB-compatible    |
| Auth       | JWT (jsonwebtoken) + bcrypt            | Simple, stateless               |
| Config     | Encrypted JSON files in `data/`        | No runtime DB needed            |
| Frontend   | React 18 + Vite 5                      | Fast builds, component model    |
| Styling    | Tailwind CSS (CDN in dev, bundled prod)| Rapid UI                        |
| Routing    | React Router v6                        | Standard SPA routing            |

---

## Directory Layout

```
scyllaui/
├── server.js                  # Express entry point
├── package.json               # Backend deps + root scripts
├── .env.example               # Required env vars template
├── .gitignore
├── README.md
├── data/                      # Runtime data — gitignored
│   ├── config.json            # Hashed admin credentials
│   └── connections.json       # Encrypted ScyllaDB connections
├── src/
│   ├── config/
│   │   └── store.js           # Read/write encrypted config files
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/setup, /login, GET /status
│   │   ├── connections.js     # CRUD /api/connections + /test
│   │   └── explorer.js        # Keyspaces, tables, schema, data, query
│   └── scylla/
│       └── manager.js         # Connection pool keyed by connection ID
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js             # Axios wrapper with JWT header
        ├── pages/
        │   ├── Setup.jsx
        │   ├── Login.jsx
        │   ├── Connections.jsx
        │   └── Explorer.jsx
        └── components/
            ├── Sidebar.jsx
            ├── TableViewer.jsx
            ├── SchemaViewer.jsx
            └── QueryEditor.jsx
```

---

## Environment Variables

```
PORT=3000                        # HTTP port (default 3000)
JWT_SECRET=<random 64-char hex>  # Signs JWT tokens
ENCRYPTION_KEY=<random string>   # AES-256-GCM key for credentials
```

`ENCRYPTION_KEY` is derived via SHA-256 hash before use, so any string is valid — but use a strong random value in production.

---

## Request Flow

```
Browser → GET /          → Express serves client/dist/index.html
Browser → GET /api/*     → Express API routes (JWT required except auth)
API route → store.js     → reads/writes data/*.json
API route → manager.js   → obtains or creates cassandra.Client for connection
cassandra.Client → ScyllaDB cluster
```

---

## Security Model

- Passwords hashed with bcrypt (cost 12)
- Connection passwords encrypted with AES-256-GCM, ENCRYPTION_KEY from env
- JWT expires in 24 h; no refresh tokens (re-login)
- `data/` directory excluded from git; users must back it up themselves
- Bot/scanner probes (404 on non-API paths) logged at `debug`, not `error`
