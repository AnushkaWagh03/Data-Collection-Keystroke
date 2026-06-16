const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/Sentence', () => ({ find: jest.fn() }));
jest.mock('../../src/models/Session', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../../src/models/StudySession', () => ({ findOne: jest.fn() }));

const Sentence = require('../../src/models/Sentence');
const Session = require('../../src/models/Session');
const StudySession = require('../../src/models/StudySession');
const sentenceRoutes = require('../../src/routes/sentences');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.studyToken = 'study-1';
    next();
  });
  app.use('/api/sentences', sentenceRoutes);
  return app;
};

const chainableLean = (value) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
  return query;
};

describe('sentences routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StudySession.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        run_config: {
          language_plan: [{ language: 'hindi' }, { language: 'english' }]
        }
      })
    });
  });

  test('returns 400 when participant_id or language is missing', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/sentences/next');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  test('returns 400 for unsupported language', async () => {
    Sentence.find.mockReturnValue(chainableLean([]));

    const app = buildApp();
    const response = await request(app).get(
      '/api/sentences/next?participant_id=P_1&study_session_id=RUN_1&language=unsupported_lang'
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Unsupported language');
  });

  test('returns non-repeating sentence within current cycle', async () => {
    const corpus = [
      { sentence_id: 1, text: 'A' },
      { sentence_id: 2, text: 'B' },
      { sentence_id: 3, text: 'C' },
    ];
    Sentence.find.mockReturnValue(chainableLean(corpus));
    Session.countDocuments.mockResolvedValue(2);
    Session.find.mockReturnValue(
      chainableLean([{ sentence_id: 1 }, { sentence_id: 2 }])
    );

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const app = buildApp();
    const response = await request(app).get(
      '/api/sentences/next?participant_id=P_2&study_session_id=RUN_2&language=hindi'
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.sentence).toEqual({ sentence_id: 3, text: 'C' });
    expect(response.body.cycle_position).toBe(2);
    expect(response.body.remaining_in_cycle).toBe(0);

    randomSpy.mockRestore();
  });

  test('starts new cycle when previous one is exhausted', async () => {
    const corpus = [
      { sentence_id: 1, text: 'A' },
      { sentence_id: 2, text: 'B' },
    ];
    Sentence.find.mockReturnValue(chainableLean(corpus));
    Session.countDocuments.mockResolvedValue(4);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const app = buildApp();
    const response = await request(app).get(
      '/api/sentences/next?participant_id=P_3&study_session_id=RUN_3&language=english'
    );

    expect(response.status).toBe(200);
    expect(response.body.cycle_position).toBe(0);
    expect(response.body.sentence.sentence_id).toBe(1);
    expect(Session.find).not.toHaveBeenCalled();

    randomSpy.mockRestore();
  });

  test('returns corpus list by language', async () => {
    const sentences = [
      { sentence_id: 1, text: 'One' },
      { sentence_id: 2, text: 'Two' },
    ];
    Sentence.find.mockReturnValue(chainableLean(sentences));

    const app = buildApp();
    const response = await request(app).get('/api/sentences/english');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      language: 'english',
      count: 2,
      sentences,
    });
  });

  test('returns 500 on query failure', async () => {
    Sentence.find.mockImplementation(() => {
      throw new Error('db error');
    });

    const app = buildApp();
    const response = await request(app).get(
      '/api/sentences/next?participant_id=P_4&study_session_id=RUN_4&language=hindi'
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to fetch next sentence',
    });
  });
});
