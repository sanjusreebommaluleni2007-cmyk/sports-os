const Resource = require('../models/Resource');

exports.addResource = async (req, res) => {
    try {
        const {
            name,
            type,
            description,
            url,
            batch,
            coach,
            quantity,
            status,
            condition,
            athleteName,
            feeMonth,
            feePaid,
            amount,
            dueDate,
        } = req.body;

        const resource = new Resource({
            name,
            type,
            sport: req.user?.sport || 'cricket',
            description,
            url,
            batch,
            coach: coach || req.user?.id,
            quantity,
            status,
            condition,
            athleteName,
            feeMonth,
            feePaid,
            amount,
            dueDate,
        });

        await resource.save();
        res.status(201).json(resource);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllResources = async (req, res) => {
    try {
        const { type } = req.query;
        const filter = { sport: req.user?.sport || 'cricket' }; if (type) filter.type = type;
        const resources = await Resource.find(filter);
        res.status(200).json(resources);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getResourcesByBatch = async (req, res) => {
    try {
        const resources = await Resource.find({
            batch: req.params.batchId,
            coach: req.user.id,
        })
            .populate('batch')
            .populate('coach');
        res.status(200).json(resources);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateResource = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.sport) filter.sport = req.user.sport;
        const resource = await Resource.findOneAndUpdate(filter, req.body, { new: true });
        if (!resource) return res.status(404).json({ message: 'Resource not found' });
        res.status(200).json(resource);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteResource = async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.sport) filter.sport = req.user.sport;
        const resource = await Resource.findOneAndDelete(filter);
        if (!resource) return res.status(404).json({ message: 'Resource not found' });
        res.status(200).json({ message: 'Resource deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};