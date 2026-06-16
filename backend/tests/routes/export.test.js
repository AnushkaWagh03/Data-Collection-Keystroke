const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/Session', () => ({ find: jest.fn() }));
jest.mock('../../src/models/Keystroke', () => ({ find: jest.fn() }));

const Session = require('../../src/models/Session');
const Keystroke = require('../../src/models/Keystroke');
const exportRoutes = require('../../src/routes/export');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/export', exportRoutes);
  return app;
};

const asAsyncCursor = (items) =>
  (async function* generator() {
    for (const item of items) {
      yield item;
    }
  })();

const chainableFind = ({ leanResult = [], cursorResult = [] } = {}) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(leanResult),
  cursor: jest.fn().mockReturnValue(asAsyncCursor(cursorResult)),
});

describe('export routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Session.countDocuments = jest.fn().mockResolvedValue(0);
    Keystroke.countDocuments = jest.fn().mockResolvedValue(0);
  });

  test('exports sessions as json payload', async () => {
    const sessions = [{ session_id: 'S1' }, { session_id: 'S2' }];
    Session.find.mockReturnValue(
      chainableFind({ leanResult: sessions, cursorResult: sessions })
    );
    Session.countDocuments.mockResolvedValue(2);

    const app = buildApp();
    const response = await request(app)
      .get('/api/export/sessions?language=hindi&format=json');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.sessions).toEqual(sessions);
    expect(Session.find).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'hindi' })
    );
  });

  test('exports sessions as jsonl', async () => {
    const sessions = [{ session_id: 'S1' }, { session_id: 'S2' }];
    Session.find.mockReturnValue(chainableFind({ cursorResult: sessions }));

    const app = buildApp();
    const response = await request(app).get('/api/export/sessions');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-ndjson');
    expect(response.text).toContain('"session_id":"S1"');
    expect(response.text).toContain('"session_id":"S2"');
  });

  test('exports keystrokes as json', async () => {
    const keystrokes = [{ key: 'a' }, { key: 'b' }];
    Keystroke.find.mockReturnValue(
      chainableFind({ leanResult: keystrokes, cursorResult: keystrokes })
    );
    Keystroke.countDocuments.mockResolvedValue(2);

    const app = buildApp();
    const response = await request(app).get(
      '/api/export/keystrokes/S_1?format=json'
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.session_id).toBe('S_1');
    expect(response.body.count).toBe(2);
    expect(response.body.keystrokes).toEqual(keystrokes);
  });

  test('exports keystrokes as jsonl', async () => {
    Keystroke.find.mockReturnValue(chainableFind({ cursorResult: [{ key: 'a' }] }));

    const app = buildApp();
    const response = await request(app).get('/api/export/keystrokes/S_2');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-ndjson');
    expect(response.text).toContain('"key":"a"');
  });

  test('returns 500 when sessions export fails', async () => {
    Session.find.mockImplementation(() => {
      throw new Error('boom');
    });

    const app = buildApp();
    const response = await request(app).get('/api/export/sessions');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to export sessions',
    });
  });

  test('returns 500 when keystroke export fails', async () => {
    Keystroke.find.mockImplementation(() => {
      throw new Error('boom');
    });

    const app = buildApp();
    const response = await request(app).get('/api/export/keystrokes/S_3');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to export keystrokes',
    });
  });
});
