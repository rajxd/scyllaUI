# Auth Feature Spec

## Overview

Single admin user. Credentials stored in `data/config.json`. First request to the app checks whether setup is complete; if not, the frontend redirects to `/setup`.

---

## Setup Flow (First Run)

**Endpoint:** `GET /api/auth/status`
- Returns `{ configured: false }` if `data/config.json` does not exist or has no `passwordHash`
- Returns `{ configured: true }` otherwise
- No auth required

**Endpoint:** `POST /api/auth/setup`
- Body: `{ username: string, password: string }`
- Validation:
  - `username`: 3–32 chars, alphanumeric + underscore
  - `password`: minimum 8 chars
- Action: bcrypt hash password (cost 12), write `{ username, passwordHash }` to `data/config.json`
- Returns: `{ ok: true }`
- Error if already configured: `409 { error: "Already configured" }`

---

## Login

**Endpoint:** `POST /api/auth/login`
- Body: `{ username: string, password: string }`
- Action: read config, compare bcrypt, issue JWT
- JWT payload: `{ sub: username, iat, exp }`
- JWT expiry: 24 hours
- Returns: `{ token: string }`
- Error: `401 { error: "Invalid credentials" }`

---

## JWT Middleware

All `/api/*` routes except `/api/auth/*` require `Authorization: Bearer <token>` header.

- Missing or expired token → `401 { error: "Unauthorized" }`
- Valid token → sets `req.user = { sub: username }`

---

## Frontend Pages

### `/setup`
- Shown automatically if `GET /api/auth/status` returns `{ configured: false }`
- Form: username + password + confirm password
- On success: redirect to `/login`

### `/login`
- Form: username + password
- On success: store JWT in `localStorage` as `scyllaui_token`
- Redirect to `/connections`
- If already logged in (valid token in localStorage): redirect to `/connections`

### Logout
- Button in app header
- Clears `localStorage` entry, redirects to `/login`

---

## Token Storage

- Key: `scyllaui_token`
- Storage: `localStorage`
- `api.js` reads this key and sets `Authorization` header on all requests
- On 401 response: clear token, redirect to `/login`
