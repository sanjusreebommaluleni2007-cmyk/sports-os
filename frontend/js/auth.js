const express = require('express');
const authController = require('../controllers/authController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', protect, authController.getMe);
router.get('/coaches', protect, roleMiddleware(['head_coach', 'owner']), authController.getCoaches);

// Profile updates (any authenticated user, own record only)
router.patch('/profile', protect, authController.updateProfile);        // ← NEW
router.patch('/profile-picture', protect, authController.updateProfilePicture);

module.exports = router;