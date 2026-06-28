const Batch = require('../models/Batch');

exports.getAllBatches = async (req, res) => {
    try {
        const user = req.user;
        let filter = { sport: user.sport };

        if (user.role === 'coach') {
            filter = { sport: user.sport, $or: [{ coachId: user._id }, { coaches: user._id }] };
        }

        const batches = await Batch.find(filter)
            .populate('coachId', 'name email')
            .populate('athletes', 'name initials specialization');

        res.status(200).json(batches);
    } catch (err) {
        console.error('getAllBatches error:', err);
        res.status(500).json({ message: 'Failed to fetch batches' });
    }
};

exports.getBatchById = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.sport) filter.sport = req.user.sport;
        const batch = await Batch.findOne(filter)
            .populate('athletes', 'name specialization initials');
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        res.status(200).json(batch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createBatch = async (req, res) => {
    try {
        const { name, coachId, athletes } = req.body;
        const batch = new Batch({ name, coachId, athletes, sport: req.user.sport });
        await batch.save();
        res.status(201).json(batch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
