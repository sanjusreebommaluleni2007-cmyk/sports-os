const express = require('express');
const router = express.Router();
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const rc = require('../controllers/rosterController');

const mgr = roleMiddleware(['owner', 'head_coach', 'coach']);

router.get('/athletes', protect, mgr, rc.getAthletes);
router.post('/athletes', protect, mgr, rc.createAthlete);
router.put('/athletes/:id', protect, mgr, rc.updateAthlete);
router.delete('/athletes/:id', protect, mgr, rc.deleteAthlete);

router.get('/coaches', protect, mgr, rc.getCoaches);
router.post('/coaches', protect, mgr, rc.createCoach);
router.put('/coaches/:id', protect, mgr, rc.updateCoach);
router.delete('/coaches/:id', protect, mgr, rc.deleteCoach);

module.exports = router;