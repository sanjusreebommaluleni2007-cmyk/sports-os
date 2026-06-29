const Attendance = require('../models/Attendance');

const saveAttendance = async (req, res) => {
    try {
        const { batchId, date, records, takenBy } = req.body;
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const attendance = await Attendance.findOneAndUpdate(
            { batch: batchId, date: { $gte: start, $lte: end } },
            { batch: batchId, date: new Date(date), records, takenBy },
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
        if (batchId) query.batch = batchId;
        if (date) {
            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(date); end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }
        const attendance = await Attendance.findOne(query);
        if (!attendance) return res.status(200).json({ records: [] });
        res.status(200).json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getAttendanceHistory = async (req, res) => {
    try {
        const { batchId, days } = req.query;
        const numDays = parseInt(days, 10) || 7;
        if (!batchId) return res.status(400).json({ message: 'batchId is required' });
        const endDate = new Date(); endDate.setHours(23, 59, 59, 999);
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

// GET /api/attendance/my — athlete's own attendance records
const getMyAttendance = async (req, res) => {
    try {
        const athleteId = req.user.id;

        // Find all attendance docs where this athlete appears in records
        const allAttendance = await Attendance.find({
            'records.athlete': athleteId
        }).sort({ date: -1 }).populate('batch', 'name');

        const result = allAttendance.map(doc => {
            const record = doc.records.find(r => r.athlete && r.athlete.toString() === athleteId);
            return {
                date: doc.date,
                sessionName: doc.batch ? doc.batch.name : 'Session',
                status: record ? record.status : 'absent',
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Get my attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { saveAttendance, getAttendance, getAttendanceHistory, getMyAttendance };