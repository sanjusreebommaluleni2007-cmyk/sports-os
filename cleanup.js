require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./backend/models/User');
    const Batch = require('./backend/models/Batch');
    await User.deleteMany({ email: /@sportsos\.com$/ });
    await Batch.deleteMany({ createdAt: { $gte: new Date('2026-06-21') } });
    console.log('Cleaned!');
    process.exit();
});