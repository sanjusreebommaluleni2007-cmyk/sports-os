require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Timetable = require('./backend/models/Timetable');
    const Batch = require('./backend/models/Batch');

    // Get all valid batch IDs that have a sport set
    const validBatches = await Batch.find({ sport: { $in: ['cricket', 'tennis', 'kabaddi'] } }, '_id').lean();
    const validIds = validBatches.map(b => b._id.toString());

    // Delete timetable slots whose batch is not in valid list
    const all = await Timetable.find({}, 'batch').lean();
    const toDelete = all.filter(t => !validIds.includes(t.batch?.toString()));

    if (toDelete.length) {
        await Timetable.deleteMany({ _id: { $in: toDelete.map(t => t._id) } });
        console.log('Deleted stale timetable slots:', toDelete.length);
    } else {
        console.log('No stale slots found');
    }

    process.exit();
});