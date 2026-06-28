require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./backend/models/User');
    const Batch = require('./backend/models/Batch');

    const coach = await User.findOne({ email: 'vvs.laxman@cricket.ac' });
    if (!coach) { console.log('Coach not found'); process.exit(); }

    const result = await Batch.findOneAndUpdate(
        { name: 'Senior Trials' },
        { coachId: coach._id },
        { new: true }
    );
    console.log('Fixed:', result.name, '→', coach.name);
    process.exit();
});
