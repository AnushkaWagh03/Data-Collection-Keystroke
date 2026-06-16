const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/Participant', () => jest.fn());
jest.mock('../../src/models/StudySession', () => ({}));
jest.mock('../../src/models/StudyLink', () => ({
  normalizeLanguagePlan: jest.fn((input = []) => input),
  normalizeSurveyOrder: jest.fn((input = []) => input),
}));

const Participant = require('../../src/models/Participant');
const participantRoutes = require('../../src/routes/participants');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.studyToken = 'study-1';
    next();
  });
  app.use('/api/participants', participantRoutes);
  return app;
};

describe('participants routes', () => {
  beforeEach(() => {
    Participant.mockReset();
  });

  test('updates existing participant', async () => {
    const save = jest.fn().mockResolvedValue();
    const existing = {
      participant_id: 'P_1',
      survey_data: { keyboard_type: 'laptop' },
      device_info: { user_agent: 'ua-old' },
      save,
    };

    Participant.findOne = jest.fn().mockResolvedValue(existing);

    const app = buildApp();
    const response = await request(app)
      .post('/api/participants')
      .send({
        participant_id: 'P_1',
        survey_data: { typing_proficiency: 'Professional' },
        device_info: { screen_resolution: '1920x1080' },
        link_token: 'study-1',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.participant_id).toBe('P_1');
    expect(existing.survey_data).toEqual({
      keyboard_type: 'laptop',
      typing_proficiency: 'Professional',
    });
    expect(existing.device_info).toEqual({
      user_agent: 'ua-old',
      screen_resolution: '1920x1080',
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('creates participant when missing', async () => {
    Participant.findOne = jest.fn().mockResolvedValue(null);

    const save = jest.fn().mockResolvedValue();
    Participant.mockImplementation(function MockParticipant(data) {
      Object.assign(this, data);
      this.save = save;
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/participants')
      .send({
        participant_id: 'P_2',
        survey_data: { typing_proficiency: 'beginner' },
        device_info: { user_agent: 'ua' },
        link_token: 'study-1',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      participant_id: 'P_2',
    });
    expect(Participant).toHaveBeenCalledWith({
      participant_id: 'P_2',
      survey_data: { typing_proficiency: 'beginner' },
      device_info: { user_agent: 'ua' },
      profile: {},
      source_link_token: 'study-1',
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('returns 500 on database failure', async () => {
    Participant.findOne = jest.fn().mockRejectedValue(new Error('db fail'));

    const app = buildApp();
    const response = await request(app)
      .post('/api/participants')
      .send({ participant_id: 'P_3', link_token: 'study-1' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to create participant',
    });
  });
});
