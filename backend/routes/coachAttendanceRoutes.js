const express = require('express');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const {
    saveCoachAttendance,
    getCoachAttendance,
    getCoachAttendanceHistory,
} = require('../controllers/coachAttendanceController');

const router = express.Router();

// Any logged-in user can read (owner-only panel is enforced on the frontend,
// but reads stay open in case other roles need it later)
router.get('/history', protect, getCoachAttendanceHistory);
router.get('/', protect, getCoachAttendance);

// Only the owner can mark coach attendance
router.post('/', protect, roleMiddleware(['owner']), saveCoachAttendance);

module.exports = router;