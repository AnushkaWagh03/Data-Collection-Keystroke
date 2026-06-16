const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/Session', () => jest.fn());
jest.mock('../../src/models/Participant', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../../src/models/StudySession', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Keystroke', () => ({ insertMany: jest.fn() }));
jest.mock('../../src/models/WindowEvent', () => ({ insertMany: jest.fn() }));
jest.mock('../../src/models/SuspiciousActivity', () => ({ insertMany: jest.fn() }));

const Session = require('../../src/models/Session');
const Participant = require('../../src/models/Participant');
const StudySession = require('../../src/models/StudySession');
const Keystroke = require('../../src/models/Keystroke');
const WindowEvent = require('../../src/models/WindowEvent');
const SuspiciousActivity = require('../../src/models/SuspiciousActivity');
const sessionRoutes = require('../../src/routes/sessions');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.studyToken = 'study-1';
    next();
  });
  app.use('/api/sessions', sessionRoutes);
  return app;
};

describe('sessions routes', () => {
  let saveMock;
  const originalStoreTypedText = process.env.STORE_TYPED_TEXT;

  beforeEach(() => {
    saveMock = jest.fn().mockResolvedValue();
    Session.mockReset();
    Session.mockImplementation(function MockSession(payload) {
      Object.assign(this, payload);
      this.save = saveMock;
    });

    Participant.findOneAndUpdate.mockReset().mockResolvedValue({});
    StudySession.findOne.mockReset().mockResolvedValue({
      sentence_counts_by_language: new Map(),
      total_sentences_completed: 0,
      current_sentence_index: 0,
      save: jest.fn().mockResolvedValue({})
    });
    Keystroke.insertMany.mockReset().mockResolvedValue([]);
    WindowEvent.insertMany.mockReset().mockResolvedValue([]);
    SuspiciousActivity.insertMany.mockReset().mockResolvedValue([]);
    process.env.STORE_TYPED_TEXT = 'false';
  });

  afterAll(() => {
    process.env.STORE_TYPED_TEXT = originalStoreTypedText;
  });

  test('saves complete session payload and related collections', async () => {
    const app = buildApp();
    const payload = {
      session_id: 'S_1',
      participant_id: 'P_1',
      study_session_id: 'RUN_1',
      language: 'hindi',
      sentence_id: 12,
      target_sentence: 'abc',
      typed_text: 'abd',
      visibility_mode: 'visible',
      session_start: 10,
      session_end: 20,
      session_duration: 10,
      survey_data: { typing_proficiency: 'beginner' },
      keystrokes: [
        { key: 'a', event_type: 'keyup', timestamp: 1000, is_backspace: false, dwell_time: 120 },
        { key: 'Backspace', event_type: 'keyup', timestamp: 61000, is_backspace: true, dwell_time: 90 },
      ],
      window_events: [
        { type: 'window_blur', timestamp: 5 },
      ],
      suspicious_activity: [
        { type: 'paste_attempt', timestamp: 6 },
      ],
      error_bursts: [{ timestamp: 7 }],
      link_token: 'study-1',
    };

    const response = await request(app)
      .post('/api/sessions')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.session_id).toBe('S_1');

    expect(Session).toHaveBeenCalledTimes(1);
    const sessionDoc = Session.mock.calls[0][0];
    expect(sessionDoc.typed_text).toBeUndefined();
    expect(sessionDoc.keystroke_count).toBe(2);
    expect(sessionDoc.backspace_count).toBe(1);
    expect(sessionDoc.window_blur_count).toBe(1);
    expect(sessionDoc.suspicious_activity_count).toBe(1);
    expect(sessionDoc.error_burst_count).toBe(1);
    expect(sessionDoc.performance_metrics).toEqual(
      expect.objectContaining({
        wpm: 0.6,
        uncorrected_error_rate: 33.3333,
        error_corrections_percent: 50,
        kspc: 0.6667,
        substitution_error_count: 1,
        omission_error_count: 0,
        insertion_error_count: 0
      })
    );
    expect(saveMock).toHaveBeenCalledTimes(1);

    expect(Keystroke.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({ session_id: 'S_1', participant_id: 'P_1', key: 'a' }),
        expect.objectContaining({ session_id: 'S_1', participant_id: 'P_1', key: 'Backspace' }),
      ],
      { ordered: false }
    );
    expect(WindowEvent.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({ session_id: 'S_1', participant_id: 'P_1', type: 'window_blur' }),
      ],
      { ordered: false }
    );
    expect(SuspiciousActivity.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({ session_id: 'S_1', participant_id: 'P_1', type: 'paste_attempt' }),
      ],
      { ordered: false }
    );
    expect(Participant.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ participant_id: 'P_1' }),
      expect.objectContaining({
        $inc: { sessions_completed: 1 },
        $addToSet: { languages_tested: 'hindi' },
        survey_data: { typing_proficiency: 'beginner' },
      })
    );
  });

  test('stores typed text only when STORE_TYPED_TEXT=true', async () => {
    process.env.STORE_TYPED_TEXT = 'true';
    const app = buildApp();

    const response = await request(app)
      .post('/api/sessions')
      .send({
        session_id: 'S_2',
        participant_id: 'P_2',
        study_session_id: 'RUN_2',
        language: 'english',
        sentence_id: 1,
        visibility_mode: 'visible',
        typed_text: 'hello',
        link_token: 'study-1',
      });

    expect(response.status).toBe(201);
    expect(Session.mock.calls[0][0].typed_text).toBe('hello');
  });

  test('skips bulk inserts when arrays are empty', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/sessions')
      .send({
        session_id: 'S_3',
        participant_id: 'P_3',
        study_session_id: 'RUN_3',
        language: 'english',
        sentence_id: 3,
        visibility_mode: 'visible',
        link_token: 'study-1',
      });

    expect(response.status).toBe(201);
    expect(Keystroke.insertMany).not.toHaveBeenCalled();
    expect(WindowEvent.insertMany).not.toHaveBeenCalled();
    expect(SuspiciousActivity.insertMany).not.toHaveBeenCalled();
  });

  test('returns 500 on session save failure', async () => {
    saveMock.mockRejectedValueOnce(new Error('save failed'));
    const app = buildApp();

    const response = await request(app)
      .post('/api/sessions')
      .send({
        session_id: 'S_4',
        participant_id: 'P_4',
        study_session_id: 'RUN_4',
        language: 'english',
        sentence_id: 1,
        visibility_mode: 'visible',
        link_token: 'study-1',
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to save session',
    });
  });
});
