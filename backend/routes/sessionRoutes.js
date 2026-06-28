const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    logSession,
    getSessions,
    getSessionById,
} = require('../controllers/sessionController');
const Session = require('../models/Session');

const router = express.Router();

router.get('/', protect, getSessions);
router.post('/', protect, logSession);
router.get('/:id', protect, getSessionById);
router.delete('/:id', protect, async (req, res) => {
    try {
        const filter = { _id: req.params.id };
        if (req.user?.sport) filter.sport = req.user.sport;
        const session = await Session.findOneAndDelete(filter);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;