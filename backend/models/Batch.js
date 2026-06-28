const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        coachId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        sport: {
            type: String,
            enum: ['cricket', 'tennis', 'kabaddi'],
        },
        schedule: {
            type: String,
            default: 'Mon–Fri · 6:00am–8:00am',
        },
        studentCount: {
            type: Number,
            default: 0,
        },
        athletes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        coaches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);