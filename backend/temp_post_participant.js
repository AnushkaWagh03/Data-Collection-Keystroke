require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');

const token = process.argv[2];
const participantId = process.argv[3] || 'demo_user';

if (!token) {
  console.error('Usage: node temp_post_participant.js <token> [participant_id]');
  process.exit(1);
}

const data = JSON.stringify({
  participant_id: participantId,
  survey_data: {},
  device_info: {},
  profile: {},
  link_token: token,
});

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5001,
  path: '/api/participants',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
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
req.write(data);
req.end();
