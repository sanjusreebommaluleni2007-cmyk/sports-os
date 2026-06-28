const express = require('express');
const router = express.Router();
const { bulkImport } = require('../controllers/importController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

// POST /api/import/bulk — owner only
router.post('/bulk', protect, roleMiddleware(['owner']), bulkImport);

module.exports = router;