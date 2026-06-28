require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Resource = require('./backend/models/Resource');
    const User = require('./backend/models/User');

    // Find the owner for each sport (so we can set the `coach` field, which is required)
    const kabaddiOwner = await User.findOne({ role: 'owner', sport: 'kabaddi' });
    const tennisOwner = await User.findOne({ role: 'owner', sport: 'tennis' });

    if (!kabaddiOwner) console.log('No kabaddi owner found — skipping kabaddi seed');
    if (!tennisOwner) console.log('No tennis owner found — skipping tennis seed');

    const kabaddiEquipment = [
        { name: 'Lime Powder', condition: 'Fresh stock', quantity: 20, status: 'IN STOCK' },
        { name: 'Kabaddi Mat', condition: 'Good', quantity: 2, status: 'IN STOCK' },
        { name: 'Jerseys / Bibs', condition: 'Good', quantity: 30, status: 'IN STOCK' },
        { name: 'Whistles', condition: 'Good', quantity: 6, status: 'IN STOCK' },
        { name: 'First Aid Kit', condition: 'Stocked', quantity: 2, status: 'IN STOCK' },
    ];

    const tennisEquipment = [
        { name: 'Tennis Rackets', condition: 'Good', quantity: 25, status: 'IN STOCK' },
        { name: 'Tennis Balls', condition: 'Fresh stock', quantity: 100, status: 'IN STOCK' },
        { name: 'Net Posts', condition: 'Good', quantity: 4, status: 'IN STOCK' },
        { name: 'Ball Machine', condition: 'Good', quantity: 1, status: 'IN STOCK' },
        { name: 'Court Brooms', condition: 'Fair', quantity: 3, status: 'IN STOCK' },
    ];

    if (kabaddiOwner) {
        for (const item of kabaddiEquipment) {
            await Resource.create({ ...item, type: 'equipment', sport: 'kabaddi', coach: kabaddiOwner._id });
        }
        console.log('Kabaddi equipment seeded:', kabaddiEquipment.length);
    }

    if (tennisOwner) {
        for (const item of tennisEquipment) {
            await Resource.create({ ...item, type: 'equipment', sport: 'tennis', coach: tennisOwner._id });
        }
        console.log('Tennis equipment seeded:', tennisEquipment.length);
    }

    process.exit();
});