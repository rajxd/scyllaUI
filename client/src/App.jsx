import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import Setup from './pages/Setup';
import Login from './pages/Login';
import Connections from './pages/Connections';
import Explorer from './pages/Explorer';

function RequireAuth({ children }) {
    const tk = localStorage.getItem('scyllaui_token');
    return tk ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const [configured, setConfigured] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.auth.status().then(d => {
            setConfigured(d.configured);
            if (!d.configured) navigate('/setup');
        }).catch(() => setConfigured(true));
    }, []);

    if (configured === null) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/setup" element={<Setup onDone={() => { setConfigured(true); navigate('/login'); }} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/connections" element={<RequireAuth><Connections /></RequireAuth>} />
            <Route path="/explorer" element={<RequireAuth><Explorer /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/connections" replace />} />
        </Routes>
    );
}
