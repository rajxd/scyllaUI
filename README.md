# 🪸 ScyllaUI

Open-source web client for **ScyllaDB** and Apache Cassandra.  
Browse keyspaces, inspect schemas, page through data, and run CQL queries — all from a browser.

[![CI](https://github.com/rajxd/scyllaUI/actions/workflows/ci.yml/badge.svg)](https://github.com/rajxd/scyllaUI/actions/workflows/ci.yml)
[![Docker](https://github.com/rajxd/scyllaUI/actions/workflows/docker.yml/badge.svg)](https://github.com/rajxd/scyllaUI/actions/workflows/docker.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/rajxd/scyllaui)](https://hub.docker.com/r/rajxd/scyllaui)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

---

## Features

- 🔌 **Multi-connection manager** — save and switch between clusters; credentials encrypted at rest (AES-256-GCM)
- 🗂 **Keyspace & table browser** — expandable sidebar tree with live search
- 📋 **Data viewer** — paginated rows using native token paging; PK / CK column badges
- 🔍 **Schema viewer** — columns, primary key layout, indexes, table options
- ⌨ **CQL query editor** — Ctrl+Enter to run; DDL blocked by default
- 🔒 **Single admin account** — bcrypt password, JWT sessions (24 h)

---

## Quickstart — Docker Hub (fastest)

No cloning required. Pull and run directly from Docker Hub:

```bash
docker run -d \
  --name scyllaui \
  -p 3000:3000 \
  -e JWT_SECRET=replace-with-a-long-random-string \
  -e ENCRYPTION_KEY=replace-with-another-random-string \
  -v scyllaui-data:/app/data \
  rajxd/scyllaui
```

Open **http://localhost:3000** and create your admin account on first visit.

> Your data persists in the `scyllaui-data` Docker volume across restarts and image updates.

---

## Quickstart — Docker Compose

**1. Clone the repo**
```bash
git clone https://github.com/rajxd/scyllaUI.git
cd scyllaUI
```

**2. Create your `.env` file**
```bash
cp .env.example .env
```
Open `.env` and set these two values — use any long random strings:
```
JWT_SECRET=replace-this-with-a-long-random-string
ENCRYPTION_KEY=replace-this-with-another-random-string
```

**3. Start**
```bash
docker compose up -d
```

**4. Open your browser**
```
http://localhost:3000
```

The first page asks you to create an admin username and password. Done — you're in.

> Your data (admin account + saved connections) is stored in a Docker volume called `scyllaui-data`. It persists across restarts, rebuilds, and image updates.

---

## Quickstart — Without Docker

**1. Clone and configure**
```bash
git clone https://github.com/rajxd/scyllaUI.git
cd scyllaUI
cp .env.example .env
# Edit .env — set JWT_SECRET and ENCRYPTION_KEY
```

**2. Install and build**
```bash
npm run setup
```
This installs all dependencies and builds the React frontend.

**3. Start**
```bash
npm start
```

Open **http://localhost:3000** and create your admin account on first visit.

---

## Configuration

Edit `.env` before starting:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ | Signs auth tokens. Use a long random string (32+ chars). |
| `ENCRYPTION_KEY` | ✅ | Encrypts saved connection passwords. Use a different random string. |
| `PORT` | — | HTTP port. Default: `3000` |
| `ALLOW_DDL` | — | Set `true` to allow DROP / ALTER / TRUNCATE in the query editor. Default: `false` |

> **Important:** Back up your `.env` file (especially `ENCRYPTION_KEY`). If you lose it, saved connection passwords become unreadable.

---

## Adding a ScyllaDB connection

1. Log in and go to **Connections**
2. Click **Add Connection**
3. Fill in:
   - **Name** — anything you want (e.g. "Production")
   - **Hosts** — comma-separated IPs or hostnames (e.g. `node1.example.com, node2.example.com`)
   - **Port** — default `9042`
   - **Datacenter** — your local datacenter name (e.g. `datacenter1`)
   - **Username / Password** — if your cluster has auth enabled
4. Click **Test Connection** to verify, then **Save**

---

## Where data is stored

| Location | Contents | Persists across restarts? |
|---|---|---|
| `data/config.json` | Admin username + password hash | ✅ Yes |
| `data/connections.json` | Saved connections (passwords AES-encrypted) | ✅ Yes |

With Docker this lives in the `scyllaui-data` named volume.  
Without Docker it lives in the `data/` folder inside the project directory.

---

## Development

```bash
npm install
cd client && npm install && cd ..
cp .env.example .env   # edit as needed

# Terminal 1 — backend (auto-restarts on changes)
npm run dev:server

# Terminal 2 — frontend (hot module reload)
npm run dev:client
```

Frontend dev server: **http://localhost:5173** (proxies `/api` to port 3000)

**Run tests:**
```bash
npm test
```

---

## Security notes

- Connection passwords are never sent to the browser after saving
- DDL statements (DROP, TRUNCATE, ALTER) are blocked in the query editor by default — set `ALLOW_DDL=true` to enable
- JWT tokens expire after 24 hours
- Never commit your `.env` file — it's gitignored by default

---

## Roadmap

- [ ] Export table data as CSV / JSON
- [ ] Query history
- [ ] Multiple user accounts
- [ ] Dark / light theme toggle
- [ ] Connection import / export

---

## Contributing

PRs welcome. Please open an issue first for large changes.

---

## License

[Apache 2.0](LICENSE) © 2025 ScyllaUI Contributors
