const mongoose = require('mongoose');

const coachAttendanceSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    sport: { type: String, default: '' },
    records: [{
        coach: { type: mongoose.Schema.Types.Mixed },
        coachName: { type: String },
        status: {
            type: String,
            enum: ['present', 'absent', 'late'],
            default: 'present'
        }
    }],
    markedBy: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CoachAttendance', coachAttendanceSchema);