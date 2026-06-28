const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const path = require('path');

// Route imports
const authRoutes = require('./routes/authRoutes');
const batchRoutes = require('./routes/batchRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const coachAttendanceRoutes = require('./routes/coachAttendanceRoutes');
const importRoutes = require('./routes/importRoute');
const rosterRoutes = require('./routes/rosterRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const passport = require('./config/passport');
app.use(passport.initialize());

// ── Static files ──────────────────────────────────────────────────────────────
// 1. Serve frontend root → gives access to /css, /js, /images etc.
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Serve frontend/pages at root → so /login.html, /dashboard.html etc. work
app.use(express.static(path.join(__dirname, '../frontend/pages')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/coach-attendance', coachAttendanceRoutes);
app.use('/api/import', importRoutes);
app.use('/api/roster', rosterRoutes);

// ── Root route → register page ────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});