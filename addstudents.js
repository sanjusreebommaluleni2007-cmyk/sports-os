require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;

    const batch = await db.collection('batches').findOne({ name: 'Spinners Camp' });
    const coachAayu = await db.collection('users').findOne({ name: 'aayu' });
    console.log('Adding students to:', batch.name);

    const result = await db.collection('users').insertMany([
        { name: 'Priya Verma', email: 'priya@spinners.com', role: 'athlete', specialization: 'Defender', initials: 'PV', batchId: batch._id, coachId: coachAayu._id, sport: 'kabaddi' },
        { name: 'Arjun Singh', email: 'arjun@spinners.com', role: 'athlete', specialization: 'All-round', initials: 'AS', batchId: batch._id, coachId: coachAayu._id, sport: 'kabaddi' },
        { name: 'Sneha Patil', email: 'sneha@spinners.com', role: 'athlete', specialization: 'Raider', initials: 'SP', batchId: batch._id, coachId: coachAayu._id, sport: 'kabaddi' },
        { name: 'Karan Mehta', email: 'karan@spinners.com', role: 'athlete', specialization: 'Defender', initials: 'KM', batchId: batch._id, coachId: coachAayu._id, sport: 'kabaddi' },
        { name: 'Divya Rao', email: 'divya@spinners.com', role: 'athlete', specialization: 'Raider', initials: 'DR', batchId: batch._id, coachId: coachAayu._id, sport: 'kabaddi' },
    ]);

    const newIds = Object.values(result.insertedIds);
    await db.collection('batches').updateOne(
        { _id: batch._id },
        { $push: { athletes: { $each: newIds } }, $set: { studentCount: newIds.length + 1 } }
    );

    console.log('Done! Added', newIds.length, 'students');
    mongoose.disconnect();
});