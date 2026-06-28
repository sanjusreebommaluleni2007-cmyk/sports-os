const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ['facility', 'equipment', 'fee'],
        },
        sport: {
            type: String,
            enum: ['cricket', 'tennis', 'kabaddi'],
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        url: {
            type: String,
        },
        status: {
            type: String,
            enum: ['IN STOCK', 'LOW', 'OUT', 'PAID', 'PENDING'],
        },
        quantity: {
            type: Number,
            default: 0,
        },
        condition: {
            type: String,
        },
        allocations: [
            {
                time: String,
                athlete: String,
                tag: {
                    type: String,
                    enum: ['PACE', 'SPIN', 'MATCH', 'FREE'],
                },
            },
        ],
        athleteName: {
            type: String,
        },
        feeMonth: {
            type: String,
        },
        feePaid: {
            type: Boolean,
            default: false,
        },
        amount: {
            type: Number,
            default: 0,
        },
        dueDate: {
            type: Date,
        },
        batch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);
module.exports = mongoose.model('Resource', resourceSchema);

