# Explorer Feature Spec

## Overview

The Explorer is the main screen. It connects to a saved ScyllaDB connection and allows browsing keyspaces, tables, schemas, and data.

---

## Session Model

The active connection is held **in memory** on the backend as a `cassandra.Client` instance, keyed by connection ID. The frontend passes `?connection=<id>` in the query string; the backend activates that connection if not already open.

**Endpoint:** `POST /api/explorer/connect/:id`
- Reads connection from store, decrypts password, calls `cassandra.Client.connect()`
- Caches client in `manager.js` pool
- Returns `{ ok: true, connectionId, name }`
- Returns `{ ok: false, error }` on driver error

---

## Keyspaces

**Endpoint:** `GET /api/explorer/keyspaces?connection=<id>`
- Queries `system_schema.keyspaces`
- Returns array: `[{ name: string, replication: object }]`
- Excludes system keyspaces: `system`, `system_auth`, `system_distributed`, `system_traces`, `system_schema`

---

## Tables

**Endpoint:** `GET /api/explorer/keyspaces/:keyspace/tables?connection=<id>`
- Queries `system_schema.tables WHERE keyspace_name = ?`
- Returns array: `[{ name: string, comment: string, gcGraceSeconds: number }]`
- Sorted alphabetically

---

## Schema

**Endpoint:** `GET /api/explorer/keyspaces/:keyspace/tables/:table/schema?connection=<id>`

Returns:
```ts
{
  columns: Array<{
    name: string;
    type: string;         // CQL type string, e.g. "text", "list<int>"
    kind: 'partition_key' | 'clustering' | 'regular' | 'static';
    position: number;     // ordering within partition/clustering keys
  }>;
  primaryKey: {
    partitionKey: string[];   // column names
    clusteringKey: string[];  // column names in order
  };
  indexes: Array<{
    name: string;
    target: string;
  }>;
  tableOptions: {
    comment: string;
    gcGraceSeconds: number;
    defaultTimeToLive: number;
    compaction: object;
    compression: object;
  };
}
```

Source tables: `system_schema.columns`, `system_schema.indexes`, `system_schema.tables`.

---

## Table Data

**Endpoint:** `GET /api/explorer/keyspaces/:keyspace/tables/:table/data?connection=<id>`

Query params:
| Param       | Default | Description                                    |
|-------------|---------|------------------------------------------------|
| `limit`     | 100     | Rows per page (max 1000)                       |
| `pageState` | —       | Opaque token from previous response for next page |

Response:
```ts
{
  columns: string[];          // column names in result order
  rows: any[][];              // row data as arrays (order matches columns)
  pageState: string | null;   // pass back as ?pageState= for next page; null = last page
  hasMore: boolean;
  count: number;              // rows in this page
}
```

Implementation:
- `SELECT * FROM <keyspace>.<table>` with `{ fetchSize: limit, pageState }`
- Row values serialized as strings for JSON safety:
  - UUID, timeuuid → string
  - blob → `<hex>` string
  - set/list/map → JSON string
  - date/timestamp → ISO string
  - null → `null`

---

## CQL Query Editor

**Endpoint:** `POST /api/explorer/query?connection=<id>`

Body:
```ts
{ cql: string; limit?: number; }
```

- `limit` caps result rows (default 200, max 2000) — appended as `LIMIT` only for SELECT if not already present
- Executes with `{ prepare: false }` (ad-hoc queries)
- Returns same shape as table data response
- On driver error: `{ error: string, code?: string }` (200 status)
- Forbidden statements: `DROP`, `TRUNCATE`, `ALTER` — return `403 { error: "DDL/destructive statements are not allowed" }`
  - Toggle via `ALLOW_DDL=true` env var for power users

---

## Frontend: Explorer Page `/explorer`

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: [ScyllaUI logo] [Connection name ▾] [Logout]│
├──────────────┬──────────────────────────────────────┤
│  Sidebar     │  Content area                         │
│  (280px)     │                                       │
│              │  [Data] [Schema]  tabs (table mode)   │
│  Keyspaces   │  or                                   │
│  ▶ ks1       │  [Query Editor]   (query mode)        │
│    ▼ ks2     │                                       │
│      table1  │                                       │
│      table2  │                                       │
│  [⌨ Query]   │                                       │
└──────────────┴──────────────────────────────────────┘
```

### Sidebar
- Keyspace list: clicking expands to show tables
- Table item: clicking opens table data browser in content area
- **Query Editor** button at bottom of sidebar
- Connection switcher in header (dropdown listing all connections)

### Table Data Browser
- Table name as heading + row count badge (estimated via `system.size_estimates` or just shown as "page N")
- Toolbar: Limit selector (50 / 100 / 500), Refresh button
- Column headers: name + CQL type badge
- Color coding:
  - Partition key columns: amber badge
  - Clustering key columns: indigo badge
  - Regular columns: slate badge
- Null values shown as `NULL` in dim italic
- Long strings truncated to 120 chars with hover tooltip
- Pagination: Prev / Next buttons; Next disabled when `hasMore = false`
- Prev: maintained via a `pageStateStack` in component state

### Schema Viewer (tab)
- Two sections: **Columns** and **Indexes**
- Columns table: Name | Type | Kind | Position
- Primary key diagram: shows `(partition_key, clustering_key)` visually
- Indexes table: Name | Target

### Query Editor
- Large textarea (monospace font) for CQL input
- Ctrl+Enter / Cmd+Enter submits query
- **Run Query** button
- Limit input (default 200)
- Results shown in same DataTable component
- Error shown in red banner below editor
- DDL blocked message shown as orange warning

---

## Error Handling

- Driver errors (connection lost, timeout): shown as red banner in content area with Reconnect button
- "Connection not found" (ID mismatch): redirect to `/connections`
- Empty table: show "No rows — table is empty" placeholder
- Query parse error: shown inline under editor
