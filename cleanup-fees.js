require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Resource = require('./backend/models/Resource');
    const deleted = await Resource.deleteMany({
        type: 'fee',
        name: {
            $in: [
                'lucy Fee — feb 2026',
                'Sneha Patil Fee — june 2026',
                'Karan Mehta Fee — jan 2026'
            ]
        }
    });
    console.log('Deleted stale fee records:', deleted.deletedCount);
    process.exit();
});