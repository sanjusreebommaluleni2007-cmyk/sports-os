require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const NEW_PASSWORD = 'coach123'; // change this if you want a different password

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    const result = await db.collection('users').updateOne(
        { name: 'Coach Ravi' },
        { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
        console.log('❌ No user named "Coach Ravi" found. Check the exact name in your database.');
    } else {
        console.log('✅ Password reset for Coach Ravi.');
        console.log('New password is:', NEW_PASSWORD);
    }

    process.exit();
});