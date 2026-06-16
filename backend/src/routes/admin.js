const crypto = require('crypto');
const express = require('express');

const StudyLink = require('../models/StudyLink');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const {
  DEFAULT_TOKEN_TTL_SECONDS,
  getAdminPassword,
  issueAdminToken,
  isAdminPasswordValid,
} = require('../utils/adminAuth');

const router = express.Router();

const normalizeToken = (token = '') => token.trim().toLowerCase();
const isTokenFormatValid = (token) => /^[a-z0-9-]{4,64}$/.test(token);

const DEFAULT_SENTENCE_COUNT = 5;

const sanitizeConfig = (inputConfig = {}) => {
  const sentenceCount = Number(inputConfig.sentence_count);
  const boundedSentenceCount = Number.isFinite(sentenceCount)
    ? Math.max(1, Math.min(200, Math.floor(sentenceCount)))
    : DEFAULT_SENTENCE_COUNT;

  const languagePlan = StudyLink.normalizeLanguagePlan(
    Array.isArray(inputConfig.language_plan) && inputConfig.language_plan.length > 0
      ? inputConfig.language_plan
      : [{ language: inputConfig.test_language || 'hindi', optional: false }]
  );

  return {
    test_language: languagePlan[0]?.language || 'hindi',
    language_plan: languagePlan,
    sentence_count: boundedSentenceCount,
    virtual_keyboard_enabled: Boolean(inputConfig.virtual_keyboard_enabled),
    survey_field_order: StudyLink.normalizeSurveyOrder(inputConfig.survey_field_order),
  };
};

const buildShareUrl = (req, token) => {
  const baseUrl =
    process.env.FRONTEND_URL ||
    `${req.protocol}://${req.get('host') || ''}`.replace(/\/+$/, '');
  return `${baseUrl}/?token=${encodeURIComponent(token)}`;
};

const buildStudyLinkResponse = (req, studyLink) => ({
  token: studyLink.token,
  name: studyLink.name,
  description: studyLink.description || '',
  active: Boolean(studyLink.active),
  config: sanitizeConfig(studyLink.config || {}),
  share_url: buildShareUrl(req, studyLink.token),
  created_at: studyLink.created_at,
  updated_at: studyLink.updated_at,
});

const generateToken = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = crypto.randomBytes(5).toString('hex');
    const exists = await StudyLink.exists({ token });
    if (!exists) {
      return token;
    }
  }

  throw new Error('Failed to generate unique token');
};

const buildAdminCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/admin',
  maxAge: DEFAULT_TOKEN_TTL_SECONDS * 1000,
});

router.post('/auth/login', (req, res) => {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return res.status(500).json({
      success: false,
      error: 'ADMIN_PANEL_PASSWORD is not configured',
    });
  }

  const { password } = req.body || {};
  console.log('Admin login attempt, received password:', password);
  const valid = isAdminPasswordValid(password);
  console.log('Password valid?', valid);
  if (!valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid admin credentials',
    });
  }

  const token = issueAdminToken('admin');
  res.cookie('admin_auth_token', token, buildAdminCookieOptions());
  return res.status(200).json({
    success: true,
    expires_in_seconds: DEFAULT_TOKEN_TTL_SECONDS,
  });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_auth_token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/admin',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out',
  });
});

router.use(requireAdminAuth);

router.get('/study-links', async (req, res) => {
  try {
    const studyLinks = await StudyLink.find({}).sort({ created_at: -1 }).lean();
    return res.status(200).json({
      success: true,
      study_links: studyLinks.map((studyLink) =>
        buildStudyLinkResponse(req, studyLink)
      ),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch study links',
    });
  }
});

router.post('/study-links', async (req, res) => {
  try {
    const body = req.body || {};
    const token = normalizeToken(body.token || (await generateToken()));

    if (!isTokenFormatValid(token)) {
      return res.status(400).json({
        success: false,
        error: 'Token must be 4-64 chars: lowercase letters, numbers, hyphen',
      });
    }

    const existing = await StudyLink.exists({ token });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Token already exists',
      });
    }

    const name = (body.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const studyLink = await StudyLink.create({
      token,
      name,
      description: (body.description || '').trim(),
      active: body.active !== false,
      config: sanitizeConfig(body.config || {}),
    });

    return res.status(201).json({
      success: true,
      study_link: buildStudyLinkResponse(req, studyLink),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create study link',
    });
  }
});

router.put('/study-links/:token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.token);
    if (!isTokenFormatValid(token)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const body = req.body || {};
    const name = (body.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const updates = {
      name,
      description: (body.description || '').trim(),
      active: body.active !== false,
      config: sanitizeConfig(body.config || {}),
    };

    const updated = await StudyLink.findOneAndUpdate(
      { token },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Study link not found',
      });
    }

    return res.status(200).json({
      success: true,
      study_link: buildStudyLinkResponse(req, updated),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update study link',
    });
  }
});

router.patch('/study-links/:token/active', async (req, res) => {
  try {
    const token = normalizeToken(req.params.token);
    if (!isTokenFormatValid(token)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const { active } = req.body || {};
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'active must be a boolean',
      });
    }

    const updated = await StudyLink.findOneAndUpdate(
      { token },
      { $set: { active } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Study link not found',
      });
    }

    return res.status(200).json({
      success: true,
      study_link: buildStudyLinkResponse(req, updated),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update study link status',
    });
  }
});

router.delete('/study-links/:token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.token);
    if (!isTokenFormatValid(token)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    const deleted = await StudyLink.findOneAndDelete({ token }).lean();
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Study link not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Study link deleted',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete study link',
    });
  }
});

module.exports = router;
