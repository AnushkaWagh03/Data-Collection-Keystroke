require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');

const token = process.argv[2]; // study token
const participantId = process.argv[3] || 'demo_user';

const connectDB = require('./src/config/database');
await connectDB();

if (!token) {
  console.error('Usage: node temp_start_session.js <token> [participant_id]');
  process.exit(1);
}

const postData = JSON.stringify({ link_token: token });

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5001,
  path: `/api/participants/${participantId}/study-sessions/start`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(postData);
req.end();
