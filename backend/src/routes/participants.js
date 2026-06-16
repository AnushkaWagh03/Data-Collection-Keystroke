const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const StudySession = require('../models/StudySession');
const StudyLink = require('../models/StudyLink');

const createStudySessionId = (participantId) =>
  `${participantId}_RUN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const PARTICIPANT_ID_REGEX = /^[A-Za-z0-9_-]{3,128}$/;
const STUDY_SESSION_ID_REGEX = /^[A-Za-z0-9_-]{3,180}$/;
const TOKEN_REGEX = /^[a-z0-9-]{4,64}$/;
const LANGUAGE_KEYS = new Set(['hindi', 'marathi', 'english']);
const PROFICIENCY_KEYS = new Set(['beginner', 'intermediate', 'professional']);

const DEFAULT_RUN_CONFIG = {
  test_language: 'hindi',
  language_plan: [{ language: 'hindi', optional: false }],
  sentence_count: 5,
  virtual_keyboard_enabled: false,
  survey_field_order: [
    'typing_proficiency',
    'primary_device',
    'occupation',
    'age_group',
    'gender',
    'has_taken_typing_course',
    'typing_hours_per_day',
  ],
};

const buildRunConfig = (rawConfig = {}) => {
  const languagePlan = StudyLink.normalizeLanguagePlan(rawConfig.language_plan || []);
  return {
    language_plan: languagePlan,
    test_language:
      languagePlan[0]?.language ||
      (['hindi', 'marathi', 'english'].includes(rawConfig.test_language)
        ? rawConfig.test_language
        : 'hindi'),
    sentence_count: Math.max(1, Math.min(200, Number(rawConfig.sentence_count || 5))),
    virtual_keyboard_enabled: Boolean(rawConfig.virtual_keyboard_enabled),
    survey_field_order: StudyLink.normalizeSurveyOrder(rawConfig.survey_field_order),
  };
};

const isObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sanitizeSurveyData = (input = {}) => {
  if (!isObject(input)) {
    return {};
  }

  const output = {};
  const scalarFields = [
    'typing_proficiency',
    'primary_device',
    'occupation',
    'age_group',
    'gender',
    'consent',
    'has_taken_typing_course',
  ];

  for (const field of scalarFields) {
    if (!(field in input)) {
      continue;
    }
    output[field] = input[field];
  }

  if ('has_taken_typing_course' in output) {
    if (typeof output.has_taken_typing_course === 'string') {
      const normalized = output.has_taken_typing_course.trim().toLowerCase();
      if (normalized === 'true') {
        output.has_taken_typing_course = true;
      } else if (normalized === 'false') {
        output.has_taken_typing_course = false;
      } else {
        delete output.has_taken_typing_course;
      }
    } else if (typeof output.has_taken_typing_course !== 'boolean') {
      delete output.has_taken_typing_course;
    }
  }

  const proficiencyByLanguage = input.typing_proficiency_by_language;
  if (isObject(proficiencyByLanguage)) {
    const normalized = {};
    for (const [language, proficiency] of Object.entries(proficiencyByLanguage)) {
      const normalizedLanguage = `${language}`.trim().toLowerCase();
      const normalizedProficiency = `${proficiency}`.trim().toLowerCase();
      if (
        LANGUAGE_KEYS.has(normalizedLanguage) &&
        PROFICIENCY_KEYS.has(normalizedProficiency)
      ) {
        normalized[normalizedLanguage] = normalizedProficiency;
      }
    }
    output.typing_proficiency_by_language = normalized;
  }

  const typingHoursByLanguage = input.typing_hours_per_day_by_language;
  if (isObject(typingHoursByLanguage)) {
    const normalized = {};
    for (const [language, hours] of Object.entries(typingHoursByLanguage)) {
      const normalizedLanguage = `${language}`.trim().toLowerCase();
      const normalizedHours = Number(hours);
      if (
        LANGUAGE_KEYS.has(normalizedLanguage) &&
        Number.isFinite(normalizedHours) &&
        normalizedHours >= 0 &&
        normalizedHours <= 24
      ) {
        normalized[normalizedLanguage] = normalizedHours;
      }
    }
    output.typing_hours_per_day_by_language = normalized;
  }

  return output;
};

const sanitizeDeviceInfo = (input = {}) => {
  if (!isObject(input)) {
    return {};
  }

  const allowed = ['user_agent', 'device_type', 'screen_resolution'];
  return allowed.reduce((acc, key) => {
    if (key in input) {
      acc[key] = input[key];
    }
    return acc;
  }, {});
};

const sanitizeProfile = (input = {}) => {
  if (!isObject(input)) {
    return {};
  }

  const allowed = [
    'ip_address',
    'browser_string',
    'browser_language',
    'device',
    'screen_w',
    'screen_h',
    'age',
    'gender',
    'native_language',
    'has_taken_typing_course',
    'wpm',
    'error_rate',
    'using_app',
    'using_features',
    'fingers',
    'time_spent_typing',
    'type_test_lang',
  ];

  return allowed.reduce((acc, key) => {
    if (key in input) {
      acc[key] = input[key];
    }
    return acc;
  }, {});
};

// Create or update participant
router.post('/', async (req, res) => {
  try {
    let requestStudyToken = req.studyToken;
    // In development (localhost) allow omission of a study token for easier testing
    if (!requestStudyToken && process.env.NODE_ENV === 'development') {
      requestStudyToken = 'dev-token';
    }
    if (!TOKEN_REGEX.test(`${requestStudyToken || ''}`)) {
      return res.status(401).json({
        success: false,
        error: 'Valid study token is required',
      });
    }

    const {
      participant_id,
      survey_data,
      device_info,
      profile,
      link_token: incomingLinkToken,
    } = req.body;
    // Use a mutable variable for link_token so we can set a dev fallback
    let link_token = incomingLinkToken;

    // If link_token is missing in dev mode, default to the fallback token
    if (!link_token && process.env.NODE_ENV === 'development') {
      link_token = requestStudyToken;
    }

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id || ''}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    const normalizedLinkToken = `${link_token || ''}`.trim().toLowerCase();
    if (normalizedLinkToken && normalizedLinkToken !== requestStudyToken) {
      return res.status(403).json({
        success: false,
        error: 'Study token mismatch',
      });
    }

    let participant = await Participant.findOne({ participant_id });
    const normalizedSurveyData = sanitizeSurveyData(survey_data);
    const normalizedDeviceInfo = sanitizeDeviceInfo(device_info);
    const normalizedProfile = sanitizeProfile(profile);
    console.log('Normalized data:', { normalizedSurveyData, normalizedDeviceInfo, normalizedProfile });
    if (participant) {
      if (
        participant.source_link_token &&
        participant.source_link_token !== requestStudyToken
      ) {
        return res.status(403).json({
          success: false,
          error: 'Participant does not belong to this study token',
        });
      }

      participant.device_info = { ...participant.device_info, ...normalizedDeviceInfo };
      participant.profile = { ...participant.profile, ...normalizedProfile };
      participant.survey_data = { ...participant.survey_data, ...normalizedSurveyData };
      participant.source_link_token = requestStudyToken;
      await participant.save();
    } else {
      participant = new Participant({
        participant_id,
        survey_data: normalizedSurveyData,
        device_info: normalizedDeviceInfo,
        profile: normalizedProfile,
        source_link_token: requestStudyToken,
      });
      await participant.save();
    }

    res.status(200).json({
      success: true,
      participant_id: participant.participant_id,
    });
  } catch (error) {
    console.error('Error creating participant:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create participant' });
  }
});

router.post('/:participant_id/study-sessions/start', async (req, res) => {
  try {
    const { participant_id } = req.params;
    const { reset_active = false, link_token } = req.body || {};

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id || ''}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    const requestStudyToken = req.studyToken;
    const participant = await Participant.findOne({ participant_id });
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    if (
      participant.source_link_token &&
      participant.source_link_token !== requestStudyToken
    ) {
      return res.status(403).json({
        success: false,
        error: 'Participant does not belong to this study token',
      });
    }

    if (
      typeof link_token === 'string' &&
      link_token.trim().toLowerCase() !== requestStudyToken
    ) {
      return res.status(403).json({
        success: false,
        error: 'Study token mismatch',
      });
    }

    if (reset_active) {
      await StudySession.updateMany(
        { participant_id, active: true },
        {
          $set: {
            active: false,
            status: 'reset',
            reset_at: new Date(),
            last_activity_at: new Date(),
          },
        }
      );
    } else {
      await StudySession.updateMany(
        { participant_id, active: true },
        { $set: { active: false, status: 'completed', completed_at: new Date() } }
      );
    }

    const studyLink = await StudyLink.findOne({
      token: requestStudyToken,
      active: true,
    }).lean();

    if (!studyLink) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive study token',
      });
    }

    const runConfig = buildRunConfig(studyLink.config || DEFAULT_RUN_CONFIG);
    participant.source_link_token = requestStudyToken;
    await participant.save();

    const studySession = await StudySession.create({
      study_session_id: createStudySessionId(participant_id),
      participant_id,
      status: 'active',
      current_stage: 'consent',
      current_language_index: 0,
      current_sentence_index: 0,
      total_sentences_completed: 0,
      link_token: requestStudyToken,
      run_config: runConfig,
      sentence_counts_by_language: {},
      survey_data: {},
      active: true,
      started_at: new Date(),
      last_activity_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      study_session: studySession,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to start study session',
    });
  }
});

router.get('/:participant_id/study-sessions/active', async (req, res) => {
  try {
    const { participant_id } = req.params;

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id || ''}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    const requestStudyToken = req.studyToken;
    const participant = await Participant.findOne({ participant_id }).lean();
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
      });
    }

    if (
      participant.source_link_token &&
      participant.source_link_token !== requestStudyToken
    ) {
      return res.status(403).json({
        success: false,
        error: 'Participant does not belong to this study token',
      });
    }

    const activeSession = await StudySession.findOne({
      participant_id,
      active: true,
      status: 'active',
      $or: [
        { link_token: requestStudyToken },
        { link_token: { $exists: false } },
        { link_token: null },
        { link_token: '' },
      ],
    })
      .sort({ last_activity_at: -1 })
      .lean();

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        error: 'No active study session found for this participant',
      });
    }

    return res.status(200).json({
      success: true,
      participant: {
        participant_id: participant.participant_id,
        survey_data: participant.survey_data || {},
      },
      study_session: activeSession,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to resume study session',
    });
  }
});

router.patch('/:participant_id/study-sessions/:study_session_id', async (req, res) => {
  try {
    const { participant_id, study_session_id } = req.params;
    const {
      current_stage,
      current_language_index,
      current_sentence_index,
      survey_data,
      mark_completed = false,
    } = req.body || {};

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id || ''}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    if (!STUDY_SESSION_ID_REGEX.test(`${study_session_id || ''}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid study_session_id format',
      });
    }

    const updates = {
      last_activity_at: new Date(),
    };

    if (typeof current_stage === 'string') {
      updates.current_stage = current_stage;
    }
    if (typeof current_language_index === 'number') {
      if (!Number.isInteger(current_language_index) || current_language_index < 0) {
        return res.status(400).json({
          success: false,
          error: 'current_language_index must be a non-negative integer',
        });
      }
      updates.current_language_index = current_language_index;
    }
    if (typeof current_sentence_index === 'number') {
      if (!Number.isInteger(current_sentence_index) || current_sentence_index < 0) {
        return res.status(400).json({
          success: false,
          error: 'current_sentence_index must be a non-negative integer',
        });
      }
      updates.current_sentence_index = current_sentence_index;
    }
    if (survey_data && typeof survey_data === 'object') {
      updates.survey_data = sanitizeSurveyData(survey_data);
    }
    if (mark_completed) {
      updates.status = 'completed';
      updates.active = false;
      updates.completed_at = new Date();
      updates.current_stage = 'complete';
    }

    const updated = await StudySession.findOneAndUpdate(
      {
        participant_id,
        study_session_id,
        $or: [
          { link_token: req.studyToken },
          { link_token: { $exists: false } },
          { link_token: null },
          { link_token: '' },
        ],
      },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Study session not found',
      });
    }

    return res.status(200).json({
      success: true,
      study_session: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update study session',
    });
  }
});

module.exports = router;
