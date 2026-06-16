const http = require('http');

const data = JSON.stringify({
  participant_id: 'test123',
  survey_data: {},
  device_info: {},
  profile: {},
  link_token: 'd7e6974bb0'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/participants',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', responseBody);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
