const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/StudyLink', () => ({
  findOne: jest.fn(),
  normalizeSurveyOrder: jest.fn((order = []) => {
    const defaults = ['keyboard_type', 'typing_proficiency', 'primary_device', 'age_group', 'gender'];
    const filtered = (Array.isArray(order) ? order : []).filter((field) =>
      defaults.includes(field)
    );
    const deduped = [...new Set(filtered)];
    for (const field of defaults) {
      if (!deduped.includes(field)) {
        deduped.push(field);
      }
    }
    return deduped;
  }),
}));

const StudyLink = require('../../src/models/StudyLink');
const studyLinkRoutes = require('../../src/routes/studyLinks');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/study-links', studyLinkRoutes);
  return app;
};

describe('study-links routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns resolved study link for active token', async () => {
    StudyLink.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        token: 'hindi-batch-a',
        name: 'Hindi Batch A',
        config: {
          test_language: 'hindi',
          sentence_count: 12,
          survey_field_order: ['typing_proficiency', 'keyboard_type'],
        },
      }),
    });

    const app = buildApp();
    const response = await request(app).get('/api/study-links/hindi-batch-a');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe('hindi-batch-a');
    expect(response.body.config.sentence_count).toBe(12);
    expect(response.body.config.survey_field_order[0]).toBe('typing_proficiency');
  });

  test('returns 404 for missing token', async () => {
    StudyLink.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const app = buildApp();
    const response = await request(app).get('/api/study-links/not-found');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: 'Study link not found',
    });
  });
});
