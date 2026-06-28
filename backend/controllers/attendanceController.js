const Attendance = require('../models/Attendance');

const saveAttendance = async (req, res) => {
    try {
        const { batchId, date, records, takenBy } = req.body;

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const attendance = await Attendance.findOneAndUpdate(
            {
                batch: batchId,
                date: { $gte: start, $lte: end }
            },
            {
                batch: batchId,
                date: new Date(date),
                records: records,
                takenBy: takenBy
            },
            { upsert: true, new: true }
        );

        res.status(200).json(attendance);
    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getAttendance = async (req, res) => {
    try {
        const { batchId, date } = req.query;

        let query = {};

        if (batchId) {
            query.batch = batchId;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        const attendance = await Attendance.findOne(query);

        if (!attendance) {
            return res.status(200).json({ records: [] });
        }

        res.status(200).json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

// New: get a range of attendance records for the history view
const getAttendanceHistory = async (req, res) => {
    try {
        const { batchId, days } = req.query;
        const numDays = parseInt(days, 10) || 7;

        if (!batchId) {
            return res.status(400).json({ message: 'batchId is required' });
        }

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (numDays - 1));
        startDate.setHours(0, 0, 0, 0);

        const records = await Attendance.find({
            batch: batchId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        res.status(200).json(records);
    } catch (error) {
        console.error('Get attendance history error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { saveAttendance, getAttendance, getAttendanceHistory };