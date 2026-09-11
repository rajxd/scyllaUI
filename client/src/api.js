const BASE = '/api';

function token() {
    return localStorage.getItem('scyllaui_token');
}

async function request(method, path, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
        localStorage.removeItem('scyllaui_token');
        window.location.href = '/login';
        return;
    }

    const data = await res.json();
    if (!res.ok && res.status !== 200) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    get:    (path)        => request('GET', path),
    post:   (path, body)  => request('POST', path, body),
    put:    (path, body)  => request('PUT', path, body),
    delete: (path)        => request('DELETE', path),

    auth: {
        status: ()            => api.get('/auth/status'),
        setup:  (body)        => api.post('/auth/setup', body),
        login:  (body)        => api.post('/auth/login', body),
    },
    connections: {
        list:   ()            => api.get('/connections'),
        create: (body)        => api.post('/connections', body),
        update: (id, body)    => api.put(`/connections/${id}`, body),
        remove: (id)          => api.delete(`/connections/${id}`),
        test:   (id)          => api.post(`/connections/${id}/test`),
    },
    explorer: {
        connect:    (id)            => api.post(`/explorer/connect/${id}`),
        disconnect: (id)            => api.post(`/explorer/disconnect/${id}`),
        keyspaces:  (cid)           => api.get(`/explorer/keyspaces?connection=${cid}`),
        tables:     (cid, ks)       => api.get(`/explorer/keyspaces/${ks}/tables?connection=${cid}`),
        schema:     (cid, ks, tbl)  => api.get(`/explorer/keyspaces/${ks}/tables/${tbl}/schema?connection=${cid}`),
        data:       (cid, ks, tbl, limit, pageState) => {
            const ps = pageState ? `&pageState=${encodeURIComponent(pageState)}` : '';
            return api.get(`/explorer/keyspaces/${ks}/tables/${tbl}/data?connection=${cid}&limit=${limit}${ps}`);
        },
        query: (cid, cql, limit)    => api.post(`/explorer/query?connection=${cid}`, { cql, limit }),
    },
};
