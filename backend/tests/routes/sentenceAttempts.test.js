const express = require('express');
const request = require('supertest');

jest.mock('../../src/models/SentenceAttempt', () => jest.fn());
jest.mock('../../src/models/Participant', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../../src/models/StudySession', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Keystroke', () => ({ insertMany: jest.fn() }));
jest.mock('../../src/models/WindowEvent', () => ({ insertMany: jest.fn() }));
jest.mock('../../src/models/SuspiciousActivity', () => ({ insertMany: jest.fn() }));

const SentenceAttempt = require('../../src/models/SentenceAttempt');
const Participant = require('../../src/models/Participant');
const StudySession = require('../../src/models/StudySession');
const Keystroke = require('../../src/models/Keystroke');
const WindowEvent = require('../../src/models/WindowEvent');
const SuspiciousActivity = require('../../src/models/SuspiciousActivity');
const sentenceAttemptRoutes = require('../../src/routes/sentenceAttempts');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.studyToken = 'study-1';
    next();
  });
  app.use('/api/attempts', sentenceAttemptRoutes);
  return app;
};

describe('sentence attempt routes', () => {
  let saveAttempt;
  let saveStudySession;
  const originalStoreTypedText = process.env.STORE_TYPED_TEXT;

  beforeEach(() => {
    saveAttempt = jest.fn().mockResolvedValue();
    saveStudySession = jest.fn().mockResolvedValue();

    SentenceAttempt.mockReset();
    SentenceAttempt.mockImplementation(function MockSentenceAttempt(payload) {
      Object.assign(this, payload);
      this.save = saveAttempt;
    });

    Participant.findOneAndUpdate.mockReset().mockResolvedValue({});
    StudySession.findOne.mockReset().mockResolvedValue({
      run_config: {
        language_plan: [{ language: 'hindi', optional: false }],
      },
      sentence_counts_by_language: new Map(),
      total_sentences_completed: 0,
      current_sentence_index: 0,
      save: saveStudySession,
    });
    Keystroke.insertMany.mockReset().mockResolvedValue([]);
    WindowEvent.insertMany.mockReset().mockResolvedValue([]);
    SuspiciousActivity.insertMany.mockReset().mockResolvedValue([]);
    process.env.STORE_TYPED_TEXT = 'true';
  });

  afterAll(() => {
    process.env.STORE_TYPED_TEXT = originalStoreTypedText;
  });

  test('saves attempt metadata and raw event details to Mongo models', async () => {
    const app = buildApp();
    const payload = {
      attempt_id: 'ATT_1',
      participant_id: 'P_1',
      study_session_id: 'RUN_1',
      link_token: 'study-1',
      run_config: {
        language_plan: [{ language: 'hindi', optional: false }],
        sentence_count: 5,
        virtual_keyboard_enabled: true,
      },
      language: 'hindi',
      sentence_id: 12,
      target_sentence: 'abc',
      typed_text: 'abd',
      visibility_mode: 'faded',
      keyboard_layout: 'inscript',
      attempt_start: 10,
      attempt_end: 2010,
      attempt_duration: 2000,
      device_type: 'desktop',
      user_agent: 'test-agent',
      screen_resolution: '1920x1080',
      viewport_size: '1200x800',
      reveal_count: 1,
      reveal_timestamps: [123],
      survey_data: {
        typing_proficiency_by_language: { hindi: 'professional' },
      },
      keystrokes: [
        {
          event_type: 'input',
          timestamp: 100,
          input_type: 'insertText',
          input_data: 'a',
          text_delta: { inserted_text: 'a' },
          text_length: 1,
        },
      ],
      window_events: [{ type: 'window_blur', timestamp: 200 }],
      suspicious_activity: [
        {
          type: 'paste_attempt',
          timestamp: 300,
          key_combination: 'Ctrl+V',
        },
      ],
      error_bursts: [{ timestamp: 400 }],
    };

    const response = await request(app).post('/api/attempts').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    expect(SentenceAttempt).toHaveBeenCalledTimes(1);
    expect(SentenceAttempt.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        attempt_id: 'ATT_1',
        participant_id: 'P_1',
        study_session_id: 'RUN_1',
        link_token: 'study-1',
        visibility_mode: 'faded',
        keyboard_layout: 'inscript',
        run_config: payload.run_config,
        typed_text: 'abd',
        window_blur_count: 1,
        suspicious_activity_count: 1,
      })
    );
    expect(saveAttempt).toHaveBeenCalledTimes(1);

    expect(Keystroke.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          attempt_id: 'ATT_1',
          participant_id: 'P_1',
          event_type: 'input',
          input_type: 'insertText',
          text_delta: { inserted_text: 'a' },
        }),
      ],
      { ordered: false }
    );
    expect(WindowEvent.insertMany).toHaveBeenCalledWith(
      [expect.objectContaining({ attempt_id: 'ATT_1', type: 'window_blur' })],
      { ordered: false }
    );
    expect(SuspiciousActivity.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          attempt_id: 'ATT_1',
          type: 'paste_attempt',
          key_combination: 'Ctrl+V',
        }),
      ],
      { ordered: false }
    );
    expect(Participant.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ participant_id: 'P_1' }),
      expect.objectContaining({
        $inc: { attempts_completed: 1 },
        survey_data: {
          typing_proficiency_by_language: { hindi: 'professional' },
        },
      })
    );
    expect(saveStudySession).toHaveBeenCalledTimes(1);
  });
});
