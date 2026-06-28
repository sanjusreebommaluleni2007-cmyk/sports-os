const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
    {
        drillType: { type: String, required: true },
        sessionDate: { type: Date, required: true },
        coachNotes: { type: String, default: '' },
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
        loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        voiceNoteUrl: { type: String, default: '' },
        sport: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);