import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 50),
      duration: __ENV.DURATION || '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const baseUrl = __ENV.BASE_URL || 'https://localhost';

export default function () {
  const response = http.get(`${baseUrl}/api/health`);
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
