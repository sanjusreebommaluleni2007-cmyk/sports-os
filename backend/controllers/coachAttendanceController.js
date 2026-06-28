const CoachAttendance = require('../models/CoachAttendance');

const saveCoachAttendance = async (req, res) => {
    try {
        const { date, records, markedBy } = req.body;
        const sport = req.user?.sport || '';

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const attendance = await CoachAttendance.findOneAndUpdate(
            { date: { $gte: start, $lte: end }, sport },
            { date: new Date(date), records, markedBy, sport },
            { upsert: true, new: true }
        );

        res.status(200).json(attendance);
    } catch (error) {
        console.error('Save coach attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getCoachAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const sport = req.user?.sport || '';

        let query = { sport };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        const attendance = await CoachAttendance.findOne(query);

        if (!attendance) {
            return res.status(200).json({ records: [] });
        }

        res.status(200).json(attendance);
    } catch (error) {
        console.error('Get coach attendance error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getCoachAttendanceHistory = async (req, res) => {
    try {
        const { days } = req.query;
        const numDays = parseInt(days, 10) || 7;
        const sport = req.user?.sport || '';

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (numDays - 1));
        startDate.setHours(0, 0, 0, 0);

        const records = await CoachAttendance.find({
            sport,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        res.status(200).json(records);
    } catch (error) {
        console.error('Get coach attendance history error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { saveCoachAttendance, getCoachAttendance, getCoachAttendanceHistory };