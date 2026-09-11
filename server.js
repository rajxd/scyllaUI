require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET env var is not set.');
    process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Auth routes (no JWT required)
app.use('/api/auth', require('./src/routes/auth'));

// Protected routes
const auth = require('./src/middleware/auth');
app.use('/api/connections', auth, require('./src/routes/connections'));
app.use('/api/explorer', auth, require('./src/routes/explorer'));

// Serve built React app
const distDir = path.join(__dirname, 'client', 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ScyllaUI running at http://localhost:${PORT}`);
});
