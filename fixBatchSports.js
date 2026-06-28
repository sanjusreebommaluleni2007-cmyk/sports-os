require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Batch = require('./backend/models/Batch');

    const cricketBatches = [
        'U-16 Elite', 'Spinners Camp',
        'U-19 Elite', 'U-16 Boys', 'U-14 Boys', 'Senior Trials'
    ];

    const kabaddiBatches = [
        'U12 Morning', 'U12 Evening',
        'U14 Morning', 'U14 Evening',
        'U16 Morning', 'U16 Evening',
        'U19 Morning', 'U19 Evening',
        'Senior Morning', 'Senior Evening'
    ];

    const r1 = await Batch.updateMany(
        { name: { $in: cricketBatches } },
        { sport: 'cricket' }
    );
    console.log('Cricket batches fixed:', r1.modifiedCount);

    const r2 = await Batch.updateMany(
        { name: { $in: kabaddiBatches } },
        { sport: 'kabaddi' }
    );
    console.log('Kabaddi batches fixed:', r2.modifiedCount);

    process.exit();
});