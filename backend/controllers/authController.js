const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, academyName, batchAssigned, specialization, sport } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'name, email, password, and role are required.' });
        }

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
            academyName,
            batchAssigned,
            specialization,
            sport: role === 'owner' ? (sport || 'cricket') : '',
        });

        res.status(201).json({
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                sport: user.sport,
                initials: user.initials,
                batchAssigned: user.batchAssigned,
                specialization: user.specialization,
                profilePicture: user.profilePicture,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (req.body.role && req.body.role !== user.role) {
            return res.status(401).json({ message: 'Incorrect role selected for this account.' });
        }

        // For non-owner roles, find the owner to get the academy's sport
        let sport = user.sport || '';
        if (user.role !== 'owner') {
            const owner = await User.findOne({ role: 'owner', academyName: user.academyName });
            if (owner) sport = owner.sport || '';
        }

        res.status(200).json({
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                sport,
                initials: user.initials,
                batchAssigned: user.batchAssigned,
                specialization: user.specialization,
                profilePicture: user.profilePicture,
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sport: user.sport,
            initials: user.initials,
            batchAssigned: user.batchAssigned,
            specialization: user.specialization,
            profilePicture: user.profilePicture,
            phone: user.phone,
            bloodGroup: user.bloodGroup,
            emergencyContact: user.emergencyContact,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/auth/coaches
exports.getCoaches = async (req, res) => {
    try {
        const filter = { role: { $in: ['coach', 'head_coach'] } };
        if (req.user?.sport) {
            filter.sport = req.user.sport;
        }
        const coaches = await User.find(filter).select('-password');
        res.status(200).json(coaches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/auth/profile-picture
exports.updateProfilePicture = async (req, res) => {
    try {
        const { profilePicture } = req.body;
        if (!profilePicture) return res.status(400).json({ message: 'profilePicture is required.' });

        const user = await User.findByIdAndUpdate(
            req.user.id, { profilePicture }, { new: true, runValidators: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({
            id: user._id, name: user.name, email: user.email,
            role: user.role, sport: user.sport, initials: user.initials,
            batchAssigned: user.batchAssigned, specialization: user.specialization,
            profilePicture: user.profilePicture,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, bloodGroup, emergencyContact } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
        if (existing) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        const updates = { name: name.trim(), email: normalizedEmail };
        if (phone !== undefined) updates.phone = phone.trim();
        if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup.trim();
        if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact.trim();

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sport: user.sport,
            initials: user.initials,
            batchAssigned: user.batchAssigned,
            specialization: user.specialization,
            profilePicture: user.profilePicture,
            phone: user.phone,
            bloodGroup: user.bloodGroup,
            emergencyContact: user.emergencyContact,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// GET /api/auth/google/callback
exports.googleCallback = async (req, res) => {
    try {
        const user = req.user;
        const token = generateToken(user._id);

        let sport = user.sport || '';
        if (!sport && user.role !== 'owner') {
            const owner = await User.findOne({ role: 'owner', academyName: user.academyName });
            if (owner) sport = owner.sport || '';
        }

        const params = new URLSearchParams({
            token,
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sport,
        });

        // Redirect to custom scheme so Android app catches it
        res.redirect(`sportsos://login?googleAuth=${encodeURIComponent(params.toString())}`);
    } catch (err) {
        res.redirect('/pages/login.html?error=google_failed');
    }
};