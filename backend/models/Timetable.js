const mongoose = require('mongoose');

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const timetableSchema = new mongoose.Schema(
    {
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            required: true,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        dayOfWeek: {
            type: String,
            enum: DAYS_OF_WEEK,
            required: true,
        },
        startTime: {
            type: String, // "09:00" 24hr format, kept as string for simple sorting/display
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        activityType: {
            type: String,
            required: true, // e.g. "Net Practice", "Fielding Drills", "Match Sim", "Fitness"
        },
        location: {
            type: String,
            default: '',
        },
        notes: {
            type: String,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

timetableSchema.index({ batch: 1, dayOfWeek: 1, startTime: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
module.exports.DAYS_OF_WEEK = DAYS_OF_WEEK;