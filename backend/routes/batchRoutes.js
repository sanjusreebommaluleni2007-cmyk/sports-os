const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getAllBatches,
    getBatchById,
    createBatch,
} = require('../controllers/batchController');

const router = express.Router();

router.get('/', protect, getAllBatches);
router.get('/:id', protect, getBatchById);
router.post('/', protect, createBatch);

module.exports = router;
