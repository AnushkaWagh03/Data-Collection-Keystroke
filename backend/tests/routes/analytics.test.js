const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/Participant', () => ({ countDocuments: jest.fn() }));
jest.mock('../../src/models/Session', () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock('../../src/models/Keystroke', () => ({ countDocuments: jest.fn() }));

const Participant = require('../../src/models/Participant');
const Session = require('../../src/models/Session');
const Keystroke = require('../../src/models/Keystroke');
const analyticsRoutes = require('../../src/routes/analytics');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRoutes);
  return app;
};

describe('analytics routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns aggregated stats', async () => {
    Participant.countDocuments.mockResolvedValue(10);
    Session.countDocuments.mockResolvedValue(50);
    Keystroke.countDocuments.mockResolvedValue(5000);
    Session.aggregate
      .mockResolvedValueOnce([{ _id: 'hindi', count: 20 }])
      .mockResolvedValueOnce([{ _id: 'visible', count: 50 }]);

    const app = buildApp();
    const response = await request(app).get('/api/analytics/stats');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.stats).toEqual({
      total_participants: 10,
      total_sessions: 50,
      total_keystrokes: 5000,
      sessions_by_language: [{ _id: 'hindi', count: 20 }],
      sessions_by_visibility_mode: [{ _id: 'visible', count: 50 }],
    });
    expect(Session.aggregate).toHaveBeenCalledTimes(2);
  });

  test('returns 500 on failure', async () => {
    Participant.countDocuments.mockRejectedValue(new Error('db fail'));

    const app = buildApp();
    const response = await request(app).get('/api/analytics/stats');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to fetch statistics',
    });
  });
});
