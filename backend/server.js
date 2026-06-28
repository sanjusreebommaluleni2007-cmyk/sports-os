const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

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
// Increased limit (default is 1mb) so base64-encoded profile picture
// uploads and bulk-import Excel files from the frontend don't get
// rejected before reaching the route.
app.use(express.json({ limit: '10mb' }));
const passport = require('./config/passport');
app.use(passport.initialize());
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
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
// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});