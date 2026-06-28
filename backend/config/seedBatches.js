require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;

    const coachRavi = await db.collection('users').findOne({ name: 'Coach Ravi' });
    const aayu = await db.collection('users').findOne({ name: 'aayu' });
    const mouni = await db.collection('users').findOne({ name: 'Mouni Athlete' });
    const lucy = await db.collection('users').findOne({ name: 'lucy' });

    await db.collection('batches').deleteMany({});

    const batch1 = await db.collection('batches').insertOne({
        name: 'U-16 Elite',
        coach: coachRavi._id,
        athletes: [mouni._id],
        createdAt: new Date()
    });

    const batch2 = await db.collection('batches').insertOne({
        name: 'Spinners Camp',
        coach: aayu._id,
        athletes: [lucy._id],
        createdAt: new Date()
    });

    await db.collection('users').updateOne(
        { _id: coachRavi._id },
        { $set: { batchAssigned: 'U-16 Elite' } }
    );
    await db.collection('users').updateOne(
        { _id: aayu._id },
        { $set: { batchAssigned: 'Spinners Camp' } }
    );
    await db.collection('users').updateOne(
        { _id: mouni._id },
        { $set: { batchAssigned: 'U-16 Elite' } }
    );
    await db.collection('users').updateOne(
        { _id: lucy._id },
        { $set: { batchAssigned: 'Spinners Camp' } }
    );

    console.log('✅ Batch 1 (U-16 Elite):', batch1.insertedId, '— coach: Coach Ravi, athlete: Mouni Athlete');
    console.log('✅ Batch 2 (Spinners Camp):', batch2.insertedId, '— coach: aayu, athlete: lucy');
    console.log('✅ User batchAssigned fields updated');
    process.exit();
});