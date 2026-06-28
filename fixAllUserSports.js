require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./backend/models/User');

    // Cricket — emails ending in @cricket.ac
    const r1 = await User.updateMany(
        { email: /@cricket\.ac$/ },
        { sport: 'cricket' }
    );
    console.log('Cricket users fixed:', r1.modifiedCount);

    // Tennis — emails ending in @tennis.ac
    const r2 = await User.updateMany(
        { email: /@tennis\.ac$/ },
        { sport: 'tennis' }
    );
    console.log('Tennis users fixed:', r2.modifiedCount);

    // Kabaddi — emails ending in @kabaddi.ac
    const r3 = await User.updateMany(
        { email: /@kabaddi\.ac$/ },
        { sport: 'kabaddi' }
    );
    console.log('Kabaddi users fixed:', r3.modifiedCount);

    process.exit();
});