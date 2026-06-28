const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['owner', 'head_coach', 'coach', 'athlete'],
            required: true,
        },
        sport: {
            type: String,
            enum: ['cricket', 'tennis', 'kabaddi', ''],
            default: '',
        },
        academyName: {
            type: String,
        },
        batchAssigned: {
            type: String,
        },
        specialization: {
            type: String,
            default: '',
        },
        googleId: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            default: '',
        },
        bloodGroup: {
            type: String,
            default: '',
        },
        emergencyContact: {
            type: String,
            default: '',
        },
        dob: {
            type: String,
            default: '',
        },
        initials: {
            type: String,
        },
        profilePicture: {
            type: String,
            default: '',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);
// Auto-generate initials before saving
userSchema.pre('save', function (next) {
    if (!this.initials && this.name) {
        const nameParts = this.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
            this.initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else {
            this.initials = nameParts[0][0].toUpperCase();
        }
    }
    next();
});
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
module.exports = mongoose.model('User', userSchema);