const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.Mixed },
    batchName: { type: String },
    date: { type: Date, required: true },
    records: [{
        athlete: { type: String },
        status: {
            type: String,
            enum: ['present', 'absent', 'late'],
            default: 'late'
        }
    }],
    takenBy: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);