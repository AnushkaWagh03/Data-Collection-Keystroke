require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const StudyLink = require('./src/models/StudyLink');
const connectDB = require('./src/config/database');

const token = process.argv[2] || 'mydevtoken123';

(async () => {
  try {
    await connectDB();
    const exists = await StudyLink.findOne({ token });
    if (exists) {
      console.log('StudyLink already exists:', token);
    } else {
      const link = await StudyLink.create({
        token,
        name: `Demo ${token}`,
        description: 'Created via temporary script',
        active: true,
        config: {},
      });
      console.log('Created StudyLink:', JSON.stringify(link, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
