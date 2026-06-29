const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    saveAttendance,
    getAttendance,
    getAttendanceHistory,
    getMyAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

router.get('/my', protect, getMyAttendance);      // athlete's own records
router.get('/history', protect, getAttendanceHistory);
router.get('/', protect, getAttendance);
router.post('/', protect, saveAttendance);

module.exports = router;