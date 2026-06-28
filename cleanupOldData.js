require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./backend/models/User');
    const Batch = require('./backend/models/Batch');

    // 1. Delete junk test owners
    const junkOwnerEmails = ['owner@test.com', 'jyo@a.c', 'roopasaividya2006@gmail.com'];
    const r1 = await User.deleteMany({ email: { $in: junkOwnerEmails }, role: 'owner' });
    console.log('Junk owners deleted:', r1.deletedCount);

    // 2. Set anu's sport to cricket
    const r2 = await User.updateOne({ email: 'anu@a.c' }, { sport: 'cricket' });
    console.log('Anu updated:', r2.modifiedCount);

    // 3. Delete old @sportsos.com users (non-owners only)
    const r3 = await User.deleteMany({ email: /@sportsos\.com$/, role: { $ne: 'owner' } });
    console.log('Old sportsos.com users deleted:', r3.deletedCount);

    // 4. Delete old junk batches
    const junkBatchNames = [
        'U-16 Elite', 'Spinners Camp',
        'U12 Morning', 'U12 Evening',
        'U14 Morning', 'U14 Evening',
        'U16 Morning', 'U16 Evening',
        'U19 Morning', 'U19 Evening',
        'Senior Morning', 'Senior Evening'
    ];
    const r4 = await Batch.deleteMany({ name: { $in: junkBatchNames } });
    console.log('Junk batches deleted:', r4.deletedCount);

    process.exit();
});