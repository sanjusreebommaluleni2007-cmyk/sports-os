const express = require('express');
const authController = require('../controllers/authController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const passport = require('../config/passport');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false, prompt: 'select_account' }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=google_failed' }), authController.googleCallback);

// Protected routes
router.get('/me', protect, authController.getMe);
router.get('/coaches', protect, roleMiddleware(['head_coach', 'owner']), authController.getCoaches);
router.patch('/profile-picture', protect, authController.updateProfilePicture);
router.patch('/profile', protect, authController.updateProfile);

module.exports = router;