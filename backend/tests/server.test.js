const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../src/server');

describe('server', () => {
  test('health endpoint responds', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Server running',
    });
  });

  test('unknown route returns 404', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
  });
});
