const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
    {
        athlete: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Batch',
            required: false,
        },
        metric: {
            type: String,
            required: true,
            enum: [
                // Cricket
                'Batting Strike Rate', 'Bowling Speed (km/h)', 'Fielding Accuracy (%)',
                'Bowling Economy', 'Batting Average', 'Catches per Session', 'bowling_overs',
                // Tennis
                'Serve Speed (km/h)', 'First Serve %', 'Rally Win %',
                'Ace Count', 'Double Fault %', 'Break Points Won %',
                // Kabaddi
                'Raid Points', 'Tackle Points', 'Super Raids',
                'Bonus Points', 'Do-or-Die Raid Success %', 'Tackle Success %',
            ],
        },
        value: {
            type: Number,
            required: true,
        },
        benchmark: {
            type: Number,
        },
        recordedDate: {
            type: Date,
            default: Date.now,
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Performance', performanceSchema);

