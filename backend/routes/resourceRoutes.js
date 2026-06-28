const express = require('express');
const router = express.Router();
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const {
    addResource,
    getAllResources,
    getResourcesByBatch,
    updateResource,
    deleteResource,
} = require('../controllers/resourceController');

const mgr = roleMiddleware(['owner', 'head_coach', 'coach']);

router.get('/', protect, mgr, getAllResources);
router.post('/', protect, mgr, addResource);
router.get('/batch/:batchId', protect, mgr, getResourcesByBatch);
router.patch('/:id', protect, mgr, updateResource);
router.delete('/:id', protect, mgr, deleteResource);

module.exports = router;