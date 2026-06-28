const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getPerformanceData,
    addPerformanceRecord,
    getBowlerWorkload,
    getRealMetrics,
    getWorkloadAlerts,
} = require('../controllers/performanceController');

const router = express.Router();

router.get('/real', protect, getRealMetrics);
router.get('/workload', protect, getBowlerWorkload);
router.get('/workload-alerts', protect, getWorkloadAlerts);
router.get('/', protect, getPerformanceData);
router.post('/', protect, addPerformanceRecord);

module.exports = router;