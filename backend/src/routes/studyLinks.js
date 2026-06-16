const express = require('express');

const StudyLink = require('../models/StudyLink');

const router = express.Router();

const normalizeToken = (token = '') => token.trim().toLowerCase();

const buildPublicStudyLink = (studyLink) => ({
  token: studyLink.token,
  name: studyLink.name,
  config: {
    test_language: studyLink.config?.test_language || 'hindi',
    language_plan: StudyLink.normalizeLanguagePlan(
      Array.isArray(studyLink.config?.language_plan) &&
      studyLink.config.language_plan.length > 0
        ? studyLink.config.language_plan
        : [{ language: studyLink.config?.test_language || 'hindi', optional: false }]
    ),
    sentence_count: Number(studyLink.config?.sentence_count || 5),
    virtual_keyboard_enabled: Boolean(
      studyLink.config?.virtual_keyboard_enabled
    ),
    survey_field_order: StudyLink.normalizeSurveyOrder(
      studyLink.config?.survey_field_order
    ),
  },
});

router.get('/:token', async (req, res) => {
  try {
    const token = normalizeToken(req.params.token);

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const studyLink = await StudyLink.findOne({ token, active: true }).lean();
    if (!studyLink) {
      return res.status(404).json({
        success: false,
        error: 'Study link not found',
      });
    }

    return res.status(200).json({
      success: true,
      ...buildPublicStudyLink(studyLink),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve study link',
    });
  }
});

module.exports = router;
