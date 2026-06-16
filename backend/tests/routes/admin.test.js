const express = require('express');
const request = require('supertest');

process.env.ADMIN_PANEL_PASSWORD = 'top-secret';
process.env.ADMIN_AUTH_SECRET = 'top-secret-auth';

jest.mock('../../src/models/StudyLink', () => ({
  exists: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  normalizeLanguagePlan: jest.fn((plan = []) => {
    const normalized = Array.isArray(plan) ? plan.filter(Boolean) : [];
    return normalized.length > 0 ? normalized : [{ language: 'hindi', optional: false }];
  }),
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
const adminRoutes = require('../../src/routes/admin');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
};

const chainableLean = (value) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
});

describe('admin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks protected route without admin token', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/admin/study-links');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('logs in and fetches study links', async () => {
    StudyLink.find.mockReturnValue(chainableLean([]));

    const app = buildApp();
    const login = await request(app)
      .post('/api/admin/auth/login')
      .send({ password: 'top-secret' });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.expires_in_seconds).toBeGreaterThan(0);
    expect(login.headers['set-cookie']).toBeDefined();

    const response = await request(app)
      .get('/api/admin/study-links')
      .set('Cookie', login.headers['set-cookie']);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      study_links: [],
    });
  });

  test('creates study link with valid admin token', async () => {
    StudyLink.exists.mockResolvedValue(false);
    StudyLink.create.mockResolvedValue({
      token: 'marathi-01',
      name: 'Marathi Cohort',
      description: '',
      active: true,
      config: {
        test_language: 'marathi',
        sentence_count: 9,
        survey_field_order: ['keyboard_type', 'typing_proficiency', 'primary_device', 'age_group', 'gender'],
      },
      created_at: new Date('2026-02-20T00:00:00.000Z'),
      updated_at: new Date('2026-02-20T00:00:00.000Z'),
    });

    const app = buildApp();
    const login = await request(app)
      .post('/api/admin/auth/login')
      .send({ password: 'top-secret' });

    const response = await request(app)
      .post('/api/admin/study-links')
      .set('Cookie', login.headers['set-cookie'])
      .send({
        token: 'marathi-01',
        name: 'Marathi Cohort',
        config: {
          test_language: 'marathi',
          sentence_count: 9,
          survey_field_order: ['keyboard_type', 'typing_proficiency'],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.study_link.token).toBe('marathi-01');
    expect(response.body.study_link.config.test_language).toBe('marathi');
    expect(StudyLink.create).toHaveBeenCalledTimes(1);
  });
});
