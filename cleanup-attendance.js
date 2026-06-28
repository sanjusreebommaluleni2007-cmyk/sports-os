require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Attendance = require('./backend/models/Attendance');
    const deleted = await Attendance.deleteMany({});
    console.log('Deleted stale attendance records:', deleted.deletedCount);
    process.exit();
});