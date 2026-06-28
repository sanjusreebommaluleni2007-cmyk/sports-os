require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./backend/models/User');

    const cricketEmails = [
        'anil.kumble@cricket.ac', 'zaheer.khan@cricket.ac', 'harbhajan.singh@cricket.ac',
        'vvs.laxman@cricket.ac', 'rohit.sharma@cricket.ac', 'shubman.gill@cricket.ac',
        'yashasvi.j@cricket.ac', 'ishan.kishan@cricket.ac', 'tilak.varma@cricket.ac',
        'ruturaj.g@cricket.ac', 'prithvi.shaw@cricket.ac', 'sarfaraz.k@cricket.ac',
        'musheer.k@cricket.ac', 'arjun.t@cricket.ac', 'washington.s@cricket.ac'
    ];

    const r1 = await User.updateMany(
        { email: { $in: cricketEmails } },
        { sport: 'cricket' }
    );
    console.log('Cricket users fixed:', r1.modifiedCount);

    process.exit();
});
