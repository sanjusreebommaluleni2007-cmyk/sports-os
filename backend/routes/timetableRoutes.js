const express = require('express');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const {
    getTimetable,
    createEntry,
    updateEntry,
    deleteEntry,
} = require('../controllers/timetableController');

const router = express.Router();

// Any logged-in user can read — results are scoped by role inside the controller
router.get('/', protect, getTimetable);

// Head coaches and owners can add, edit, or remove schedule entries
router.post('/', protect, roleMiddleware(['head_coach', 'owner']), createEntry);
router.put('/:id', protect, roleMiddleware(['head_coach', 'owner']), updateEntry);
router.delete('/:id', protect, roleMiddleware(['head_coach', 'owner']), deleteEntry);

module.exports = router;