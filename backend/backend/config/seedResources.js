require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('../models/Resource');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
};

const seedData = async () => {
    await connectDB();
    await Resource.deleteMany({});

    await Resource.insertMany([
        // Equipment
        { type: 'equipment', name: 'Leather Balls — New', condition: 'Excellent', status: 'IN STOCK', quantity: 48 },
        { type: 'equipment', name: 'Leather Balls — Old', condition: 'Practice', status: 'IN STOCK', quantity: 212 },
        { type: 'equipment', name: 'Batting Tees', condition: 'Good', status: 'IN STOCK', quantity: 18 },
        { type: 'equipment', name: 'Bowling Machines', condition: '1 maintenance', status: 'LOW', quantity: 3 },
        { type: 'equipment', name: 'Stumps', condition: 'Good', status: 'IN STOCK', quantity: 24 },
        { type: 'equipment', name: 'Cones', condition: 'Fair', status: 'IN STOCK', quantity: 50 },

        // Fees
        { type: 'fee', name: 'R. Gaikwad', athleteName: 'R. Gaikwad', feeMonth: 'June', feePaid: true, status: 'PAID' },
        { type: 'fee', name: 'R. Jadeja', athleteName: 'R. Jadeja', feeMonth: 'June', feePaid: true, status: 'PAID' },
        { type: 'fee', name: 'S. Iyer', athleteName: 'S. Iyer', feeMonth: 'June', feePaid: false, status: 'PENDING' },
        { type: 'fee', name: 'Y. Chahal', athleteName: 'Y. Chahal', feeMonth: 'June', feePaid: true, status: 'PAID' },
        { type: 'fee', name: 'M. Pathirana', athleteName: 'M. Pathirana', feeMonth: 'June', feePaid: false, status: 'PENDING' },
        { type: 'fee', name: 'I. Kishan', athleteName: 'I. Kishan', feeMonth: 'June', feePaid: true, status: 'PAID' },
    ]);

    console.log('✅ Resources seeded!');
    process.exit();
};

seedData();