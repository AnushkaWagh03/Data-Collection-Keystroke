const express = require('express');
const router = express.Router();

const SentenceAttempt = require('../models/SentenceAttempt');
const Participant = require('../models/Participant');
const StudySession = require('../models/StudySession');
const Keystroke = require('../models/Keystroke');
const WindowEvent = require('../models/WindowEvent');
const SuspiciousActivity = require('../models/SuspiciousActivity');
const { calculatePerformanceMetrics } = require('../utils/performanceMetrics');

const PARTICIPANT_ID_REGEX = /^[A-Za-z0-9_-]{3,128}$/;
const ATTEMPT_ID_REGEX = /^[A-Za-z0-9_-]{3,180}$/;
const LANGUAGE_KEYS = new Set(['hindi', 'marathi', 'english']);
const VISIBILITY_MODES = new Set([
  'visible',
  'faded',
  'blurred',
  'hidden',
  'timed_reveal',
]);
const TOKEN_REGEX = /^[a-z0-9-]{4,64}$/;
const TIMING_EVENT_TYPES = new Set(['keydown', 'keyup', 'virtual']);

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const MAX_KEYSTROKES_PER_SESSION = parsePositiveInt(
  process.env.MAX_KEYSTROKES_PER_SESSION,
  3000
);
const MAX_WINDOW_EVENTS_PER_SESSION = parsePositiveInt(
  process.env.MAX_WINDOW_EVENTS_PER_SESSION,
  500
);
const MAX_SUSPICIOUS_EVENTS_PER_SESSION = parsePositiveInt(
  process.env.MAX_SUSPICIOUS_EVENTS_PER_SESSION,
  500
);
const MAX_ERROR_BURSTS_PER_SESSION = parsePositiveInt(
  process.env.MAX_ERROR_BURSTS_PER_SESSION,
  1000
);
const MAX_SENTENCE_TEXT_LENGTH = parsePositiveInt(
  process.env.MAX_SENTENCE_TEXT_LENGTH,
  1000
);

const normalizeToken = (value = '') => `${value}`.trim().toLowerCase();

const isObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isTimingKeystroke = (event = {}) => {
  if (!isObject(event)) {
    return false;
  }

  const eventType = `${event.event_type || ''}`.toLowerCase();
  if (!eventType) {
    return true;
  }

  return TIMING_EVENT_TYPES.has(eventType);
};

const sanitizeSurveyData = (input = {}) => {
  if (!isObject(input)) {
    return {};
  }

  const output = {};
  const allowedScalarFields = [
    'typing_proficiency',
    'primary_device',
    'occupation',
    'age_group',
    'gender',
    'consent',
  ];

  for (const key of allowedScalarFields) {
    if (!(key in input)) {
      continue;
    }
    output[key] = input[key];
  }

  const languageProficiency = input.typing_proficiency_by_language;
  if (isObject(languageProficiency)) {
    const normalized = {};
    for (const [language, proficiency] of Object.entries(languageProficiency)) {
      const normalizedLanguage = `${language}`.trim().toLowerCase();
      if (!LANGUAGE_KEYS.has(normalizedLanguage)) {
        continue;
      }
      if (
        ['beginner', 'intermediate', 'professional'].includes(
          `${proficiency}`.trim().toLowerCase()
        )
      ) {
        normalized[normalizedLanguage] = `${proficiency}`.trim().toLowerCase();
      }
    }
    output.typing_proficiency_by_language = normalized;
  }

  return output;
};

const validateAttemptPayload = (payload = {}) => {
  if (!ATTEMPT_ID_REGEX.test(`${payload.attempt_id || ''}`)) {
    return 'Invalid attempt_id';
  }

  if (!PARTICIPANT_ID_REGEX.test(`${payload.participant_id || ''}`)) {
    return 'Invalid participant_id';
  }

  if (!ATTEMPT_ID_REGEX.test(`${payload.study_session_id || ''}`)) {
    return 'Invalid study_session_id';
  }

  if (!LANGUAGE_KEYS.has(`${payload.language || ''}`.trim().toLowerCase())) {
    return 'Unsupported language';
  }

  if (!VISIBILITY_MODES.has(`${payload.visibility_mode || ''}`)) {
    return 'Invalid visibility_mode';
  }

  if (!Number.isFinite(Number(payload.sentence_id))) {
    return 'Invalid sentence_id';
  }

  const targetSentence = `${payload.target_sentence || ''}`;
  const typedText = `${payload.typed_text || ''}`;
  if (targetSentence.length > MAX_SENTENCE_TEXT_LENGTH) {
    return 'target_sentence exceeds allowed length';
  }
  if (typedText.length > MAX_SENTENCE_TEXT_LENGTH) {
    return 'typed_text exceeds allowed length';
  }

  if (payload.keystrokes !== undefined && !Array.isArray(payload.keystrokes)) {
    return 'keystrokes must be an array';
  }
  if (payload.window_events !== undefined && !Array.isArray(payload.window_events)) {
    return 'window_events must be an array';
  }
  if (payload.suspicious_activity !== undefined && !Array.isArray(payload.suspicious_activity)) {
    return 'suspicious_activity must be an array';
  }
  if (payload.error_bursts !== undefined && !Array.isArray(payload.error_bursts)) {
    return 'error_bursts must be an array';
  }

  const keystrokes = Array.isArray(payload.keystrokes) ? payload.keystrokes : [];
  const windowEvents = Array.isArray(payload.window_events) ? payload.window_events : [];
  const suspiciousEvents = Array.isArray(payload.suspicious_activity)
    ? payload.suspicious_activity
    : [];
  const errorBursts = Array.isArray(payload.error_bursts) ? payload.error_bursts : [];

  if (keystrokes.length > MAX_KEYSTROKES_PER_SESSION) {
    return `keystrokes exceeds max of ${MAX_KEYSTROKES_PER_SESSION}`;
  }
  if (windowEvents.length > MAX_WINDOW_EVENTS_PER_SESSION) {
    return `window_events exceeds max of ${MAX_WINDOW_EVENTS_PER_SESSION}`;
  }
  if (suspiciousEvents.length > MAX_SUSPICIOUS_EVENTS_PER_SESSION) {
    return `suspicious_activity exceeds max of ${MAX_SUSPICIOUS_EVENTS_PER_SESSION}`;
  }
  if (errorBursts.length > MAX_ERROR_BURSTS_PER_SESSION) {
    return `error_bursts exceeds max of ${MAX_ERROR_BURSTS_PER_SESSION}`;
  }

  for (const item of keystrokes) {
    if (!isObject(item)) {
      return 'keystrokes contains invalid entries';
    }
  }
  for (const item of windowEvents) {
    if (!isObject(item)) {
      return 'window_events contains invalid entries';
    }
  }
  for (const item of suspiciousEvents) {
    if (!isObject(item)) {
      return 'suspicious_activity contains invalid entries';
    }
  }

  return null;
};

/**
 * Save typing attempt
 */
router.post('/', async (req, res) => {
  try {
    const requestStudyToken = req.studyToken;
    if (!TOKEN_REGEX.test(`${requestStudyToken || ''}`)) {
      return res.status(401).json({
        success: false,
        error: 'Valid study token is required',
      });
    }

    const validationError = validateAttemptPayload(req.body || {});
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const {
      attempt_id,
      participant_id,
      study_session_id,
      link_token,
      run_config,
      language,
      sentence_id,
      target_sentence,
      typed_text,
      visibility_mode,
      attempt_start,
      attempt_end,
      attempt_duration,
      keystrokes = [],
      window_events = [],
      suspicious_activity = [],
      error_bursts = [],
      reveal_count,
      reveal_timestamps,
      device_type,
      keyboard_layout,
      user_agent,
      screen_resolution,
      viewport_size,
      survey_data,
    } = req.body;

    const payloadLinkToken = normalizeToken(link_token);
    if (payloadLinkToken && payloadLinkToken !== requestStudyToken) {
      return res.status(403).json({
        success: false,
        error: 'Study token mismatch',
      });
    }

    const authorizedStudySession = await StudySession.findOne({
      participant_id,
      study_session_id,
      $or: [
        { link_token: requestStudyToken },
        { link_token: { $exists: false } },
        { link_token: null },
        { link_token: '' },
      ],
    });

    if (!authorizedStudySession) {
      return res.status(403).json({
        success: false,
        error: 'Study attempt is not authorized for this study token',
      });
    }

    const plannedLanguages = (authorizedStudySession.run_config?.language_plan || [])
      .map((entry) => `${entry?.language || ''}`.trim().toLowerCase())
      .filter((entry) => LANGUAGE_KEYS.has(entry));
    if (plannedLanguages.length > 0 && !plannedLanguages.includes(`${language}`.toLowerCase())) {
      return res.status(403).json({
        success: false,
        error: 'Language is not allowed for this study attempt',
      });
    }

    const normalizedSurveyData = sanitizeSurveyData(survey_data);

    const attempt = new SentenceAttempt({
      performance_metrics: calculatePerformanceMetrics({
        targetSentence: target_sentence,
        typedText: typed_text,
        attemptDurationMs: attempt_duration,
        keystrokes
      }),
      attempt_id,
      participant_id,
      study_session_id,
      link_token: requestStudyToken,
      run_config,
      language,
      sentence_id,
      target_sentence,
      typed_text:
        process.env.STORE_TYPED_TEXT === 'true'
          ? typed_text
          : undefined,
      visibility_mode,
      attempt_start,
      attempt_end,
      attempt_duration,
      device_type,
      keyboard_layout,
      user_agent,
      screen_resolution,
      viewport_size,
      reveal_count,
      reveal_timestamps,
      keystroke_count: keystrokes.filter(isTimingKeystroke).length,
      backspace_count: keystrokes.filter((k) => isTimingKeystroke(k) && k.is_backspace).length,
      error_burst_count: error_bursts.length,
      window_blur_count: window_events.filter(e => e.type === 'window_blur').length,
      suspicious_activity_count: suspicious_activity.length,
    });

    await attempt.save();

    if (keystrokes.length > 0) {
      await Keystroke.insertMany(
        keystrokes.map(k => ({
          attempt_id,
          participant_id,
          ...k,
        })),
        { ordered: false }
      );
    }

    if (window_events.length > 0) {
      await WindowEvent.insertMany(
        window_events.map(e => ({
          attempt_id,
          participant_id,
          ...e,
        })),
        { ordered: false }
      );
    }

    if (suspicious_activity.length > 0) {
      await SuspiciousActivity.insertMany(
        suspicious_activity.map(a => ({
          attempt_id,
          participant_id,
          ...a,
        })),
        { ordered: false }
      );
    }

    await Participant.findOneAndUpdate(
      {
        participant_id,
        $or: [
          { source_link_token: requestStudyToken },
          { source_link_token: { $exists: false } },
          { source_link_token: null },
          { source_link_token: '' },
        ],
      },
      {
        $inc: { attempts_completed: 1 },
        $addToSet: { languages_tested: language },
        survey_data: normalizedSurveyData,
        source_link_token: requestStudyToken,
      }
    );

    if (authorizedStudySession) {
      const languageCount =
        Number(authorizedStudySession.sentence_counts_by_language?.get(language) || 0) + 1;
      authorizedStudySession.total_sentences_completed =
        Number(authorizedStudySession.total_sentences_completed || 0) + 1;
      authorizedStudySession.sentence_counts_by_language.set(language, languageCount);
      authorizedStudySession.current_sentence_index =
        Number(authorizedStudySession.current_sentence_index || 0) + 1;
      authorizedStudySession.last_activity_at = new Date();
      if (Object.keys(normalizedSurveyData).length > 0) {
        authorizedStudySession.survey_data = normalizedSurveyData;
      }
      await authorizedStudySession.save();
    }

    res.status(201).json({
      success: true,
      attempt_id,
      message: 'Sentence Attempt saved successfully',
    });

  } catch (error) {
    console.error('Error saving attempt:', error);
    if (error?.code === 11000 && error?.keyPattern?.attempt_id) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate attempt_id',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to save attempt',
    });
  }
});

module.exports = router;
