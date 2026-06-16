const express = require('express');
const router = express.Router();

const SentenceAttempt = require('../models/SentenceAttempt');
const Keystroke = require('../models/Keystroke');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const MAX_PAGE_SIZE = parsePositiveInt(process.env.EXPORT_MAX_PAGE_SIZE, 2000);
const DEFAULT_PAGE_SIZE = Math.min(
  MAX_PAGE_SIZE,
  parsePositiveInt(process.env.EXPORT_DEFAULT_PAGE_SIZE, 500)
);

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const validateFormat = (value) => (value === 'json' ? 'json' : 'jsonl');

const streamNdjson = async (res, cursor) => {
  let isFirst = true;
  for await (const doc of cursor) {
    if (!isFirst) {
      res.write('\n');
    }
    res.write(JSON.stringify(doc));
    isFirst = false;
  }
  res.end();
};

/**
 * Export attempts
 */
router.get('/attempts', async (req, res) => {
  try {
    const { language, start_date, end_date } = req.query;
    const format = validateFormat(req.query.format);

    const query = {};

    if (language) query.language = language;

    if (start_date || end_date) {
      const startDate = parseDate(start_date);
      const endDate = parseDate(end_date);

      if ((start_date && !startDate) || (end_date && !endDate)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use ISO-8601 date values.',
        });
      }

      query.created_at = {};
      if (startDate) query.created_at.$gte = startDate;
      if (endDate) query.created_at.$lte = endDate;
    }

    if (format === 'jsonl') {
      const cursor = SentenceAttempt.find(query)
        .sort({ created_at: 1 })
        .cursor();
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', 'attachment; filename=attempts.jsonl');
      await streamNdjson(res, cursor);
      return;
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      parsePositiveInt(req.query.limit, DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      SentenceAttempt.find(query)
        .sort({ created_at: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SentenceAttempt.countDocuments(query),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error('Error exporting attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export attempts',
    });
  }
});

/**
 * Export keystrokes for a attempt
 */
router.get('/keystrokes/:attempt_id', async (req, res) => {
  try {
    const { attempt_id } = req.params;
    const format = validateFormat(req.query.format);

    if (format === 'jsonl') {
      const cursor = Keystroke.find({ attempt_id })
        .sort({ timestamp: 1 })
        .cursor();
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${attempt_id}_keystrokes.jsonl`
      );
      await streamNdjson(res, cursor);
      return;
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      parsePositiveInt(req.query.limit, DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * limit;

    const [keystrokes, total] = await Promise.all([
      Keystroke.find({ attempt_id })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Keystroke.countDocuments({ attempt_id }),
    ]);

    res.json({
      success: true,
      attempt_id,
      page,
      limit,
      total,
      count: keystrokes.length,
      keystrokes,
    });
  } catch (error) {
    console.error('Error exporting keystrokes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export keystrokes',
    });
  }
});

module.exports = router;
