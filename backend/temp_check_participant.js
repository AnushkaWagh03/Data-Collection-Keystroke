require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const Participant = require('./src/models/Participant');

const participantId = process.argv[2] || 'test123';

(async () => {
  try {
    await connectDB();
    const doc = await Participant.findOne({ participant_id: participantId }).lean();
    if (doc) {
      console.log('Participant found:', JSON.stringify(doc, null, 2));
    } else {
      console.log('No participant found with id', participantId);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
