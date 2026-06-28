require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Resource = require('./backend/models/Resource');
    const r = await Resource.updateMany({ sport: { $exists: false } }, { sport: 'cricket' });
    console.log('Tagged:', r.modifiedCount);
    process.exit();
});