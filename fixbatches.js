require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ role: 'coach' }).toArray();

    for (const u of users) {
        const r = await db.collection('batches').updateMany(
            { coach: u._id },
            { $set: { coachId: u._id } }
        );
        console.log(u.name, '→ updated', r.modifiedCount, 'batches');
    }

    // Show all batches after fix
    const all = await db.collection('batches').find({}).toArray();
    console.log('\nAll batches now:');
    all.forEach(b => console.log(' -', b.name, '| coachId:', b.coachId));

    mongoose.disconnect();
});