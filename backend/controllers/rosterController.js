const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ── Athletes ──────────────────────────────────────────────────────────────────

exports.getAthletes = async (req, res) => {
    try {
        const filter = { role: 'athlete' };
        if (req.user?.sport) filter.sport = req.user.sport;
        const athletes = await User.find(filter, '-password').lean();
        res.status(200).json(athletes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createAthlete = async (req, res) => {
    try {
        const { name, email, password, specialization, phone, dob, batchAssigned } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email and password are required' });
        }
        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(409).json({ message: 'Email already in use' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashed,
            role: 'athlete',
            sport: req.user.sport,
            specialization: specialization || '',
            phone: phone || '',
            dob: dob || '',
            batchAssigned: batchAssigned || '',
        });

        const { password: _p, ...safe } = user.toObject();
        res.status(201).json(safe);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateAthlete = async (req, res) => {
    try {
        const filter = { _id: req.params.id, role: 'athlete' };
        if (req.user?.sport) filter.sport = req.user.sport;

        const updates = {};
        const allowed = ['name', 'email', 'specialization', 'phone', 'dob', 'batchAssigned', 'profilePicture'];
        allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(req.body.password, salt);
        }

        const user = await User.findOneAndUpdate(filter, updates, { new: true, select: '-password' });
        if (!user) return res.status(404).json({ message: 'Athlete not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteAthlete = async (req, res) => {
    try {
        const filter = { _id: req.params.id, role: 'athlete' };
        if (req.user?.sport) filter.sport = req.user.sport;
        const user = await User.findOneAndDelete(filter);
        if (!user) return res.status(404).json({ message: 'Athlete not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Coaches ───────────────────────────────────────────────────────────────────

exports.getCoaches = async (req, res) => {
    try {
        const filter = { role: { $in: ['coach', 'head_coach'] } };
        if (req.user?.sport) filter.sport = req.user.sport;
        const coaches = await User.find(filter, '-password').lean();
        res.status(200).json(coaches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createCoach = async (req, res) => {
    try {
        const { name, email, password, role, specialization, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email and password are required' });
        }
        if (!['coach', 'head_coach'].includes(role)) {
            return res.status(400).json({ message: 'role must be coach or head_coach' });
        }
        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(409).json({ message: 'Email already in use' });

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashed,
            role,
            sport: req.user.sport,
            specialization: specialization || '',
            phone: phone || '',
        });

        const { password: _p, ...safe } = user.toObject();
        res.status(201).json(safe);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateCoach = async (req, res) => {
    try {
        const filter = { _id: req.params.id, role: { $in: ['coach', 'head_coach'] } };
        if (req.user?.sport) filter.sport = req.user.sport;

        const updates = {};
        const allowed = ['name', 'email', 'role', 'specialization', 'phone', 'profilePicture'];
        allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(req.body.password, salt);
        }

        const user = await User.findOneAndUpdate(filter, updates, { new: true, select: '-password' });
        if (!user) return res.status(404).json({ message: 'Coach not found' });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteCoach = async (req, res) => {
    try {
        const filter = { _id: req.params.id, role: { $in: ['coach', 'head_coach'] } };
        if (req.user?.sport) filter.sport = req.user.sport;
        const user = await User.findOneAndDelete(filter);
        if (!user) return res.status(404).json({ message: 'Coach not found' });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};