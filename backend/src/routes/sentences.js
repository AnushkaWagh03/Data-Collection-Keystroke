const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const Sentence = require('../models/Sentence');
const SentenceAttempt = require('../models/SentenceAttempt');
const StudySession = require('../models/StudySession');

const LANGUAGE_KEYS = new Set(['hindi', 'marathi', 'english']);
const PARTICIPANT_ID_REGEX = /^[A-Za-z0-9_-]{3,128}$/;
const STUDY_SESSION_ID_REGEX = /^[A-Za-z0-9_-]{3,180}$/;
const TOKEN_REGEX = /^[a-z0-9-]{4,64}$/;
const MIN_SENTENCE_GRAPHEMES = 70;
const MAX_SENTENCE_GRAPHEMES = 120;
const DEFAULT_BATCH_SIZE = 15;
const MAX_BATCH_SIZE = 20;

const LANGUAGE_TO_INDICQA_CODE = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
};

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
    : null;

function normalizeSentence(value = '') {
  return `${value || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function countGraphemes(value = '') {
  const text = normalizeSentence(value).normalize('NFC');
  if (!text) {
    return 0;
  }

  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text)).length;
  }

  return Array.from(text).length;
}

function isInSentenceLengthRange(value = '') {
  const length = countGraphemes(value);
  return length >= MIN_SENTENCE_GRAPHEMES && length <= MAX_SENTENCE_GRAPHEMES;
}

function splitIndicqaContext(context = '') {
  return `${context || ''}`
    .split(/(?<=[.!?।|])\s+|[।|]+|\n+/)
    .map((entry) => normalizeSentence(entry))
    .filter(Boolean);
}

function normalizeCorpusEntries(entries = []) {
  return entries
    .filter(
      (entry) =>
        entry &&
        Number.isFinite(Number(entry.sentence_id)) &&
        typeof entry.text === 'string' &&
        isInSentenceLengthRange(entry.text)
    )
    .map((entry) => ({
      sentence_id: Number(entry.sentence_id),
      text: normalizeSentence(entry.text),
    }));
}

function pickRandomSentence(sentences) {
  const randomIndex = Math.floor(Math.random() * sentences.length);
  return sentences[randomIndex];
}

function parseBatchSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(parsed)));
}

function loadIndicqaCorpus(language) {
  const languageCode = LANGUAGE_TO_INDICQA_CODE[language];
  if (!languageCode) {
    return [];
  }

  const candidates = [
    path.resolve(__dirname, '../../data/corpora/indicqa', `${language}.json`),
    path.resolve(__dirname, '../../data/corpora/indicqa', `indicqa.${language}.json`),
    path.resolve(__dirname, '../../data/corpora/indicqa', `${languageCode}.json`),
    path.resolve(__dirname, '../../data/corpora/indicqa', `indicqa.${languageCode}.json`),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const candidatesFromIndicqa = [];

      for (const item of parsed.data || []) {
        for (const paragraph of item.paragraphs || []) {
          candidatesFromIndicqa.push(...splitIndicqaContext(paragraph.context));
          for (const qa of paragraph.qas || []) {
            if (typeof qa?.question === 'string') {
              candidatesFromIndicqa.push(normalizeSentence(qa.question));
            }
          }
        }
      }

      const deduped = [];
      const seen = new Set();
      for (const text of candidatesFromIndicqa) {
        if (!isInSentenceLengthRange(text)) {
          continue;
        }

        const key = text.toLowerCase();
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        deduped.push(text);
      }

      return deduped.map((text, index) => ({
        sentence_id: index + 1,
        text,
      }));
    } catch (error) {
      continue;
    }
  }

  return [];
}

function loadCorpusFromLanguageConfig(language, allowIndicqa = true) {
  if (allowIndicqa) {
    const indicqa = loadIndicqaCorpus(language);
    if (indicqa.length > 0) {
      return indicqa;
    }
  }

  const candidates = [
    path.resolve(__dirname, '../../../frontend/src/config/languages', `${language}.json`),
    path.resolve(__dirname, '../../data/languages', `${language}.json`),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.dataset_sentences)) {
        return [];
      }

      return normalizeCorpusEntries(
        parsed.dataset_sentences
        .filter((text) => typeof text === 'string' && text.trim())
        .map((text, index) => ({
          sentence_id: index + 1,
          text,
        }))
      );
    } catch (error) {
      continue;
    }
  }

  return [];
}

router.get('/next', async (req, res) => {
  try {
    const { participant_id, study_session_id, language } = req.query;
    const requestStudyToken = `${req.studyToken || ''}`;

    if (!participant_id || !study_session_id || !language) {
      return res.status(400).json({
        success: false,
        error: 'participant_id, study_session_id and language are required',
      });
    }

    const normalizedLanguage = `${language}`.trim().toLowerCase();
    if (!LANGUAGE_KEYS.has(normalizedLanguage)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
      });
    }

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    if (!STUDY_SESSION_ID_REGEX.test(`${study_session_id}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid study_session_id format',
      });
    }

    if (!TOKEN_REGEX.test(requestStudyToken)) {
      return res.status(401).json({
        success: false,
        error: 'Valid study token is required',
      });
    }

    const studySession = await StudySession.findOne({
      participant_id,
      study_session_id,
      $or: [
        { link_token: requestStudyToken },
        { link_token: { $exists: false } },
        { link_token: null },
        { link_token: '' },
      ],
    })
      .select('run_config.language_plan')
      .lean();

    if (!studySession) {
      return res.status(403).json({
        success: false,
        error: 'Study session is not authorized for this study token',
      });
    }

    const plannedLanguages = (studySession.run_config?.language_plan || [])
      .map((entry) => `${entry?.language || ''}`.trim().toLowerCase())
      .filter((entry) => LANGUAGE_KEYS.has(entry));

    if (plannedLanguages.length > 0 && !plannedLanguages.includes(normalizedLanguage)) {
      return res.status(403).json({
        success: false,
        error: 'Language is not part of this study session configuration',
      });
    }

    let corpus = normalizeCorpusEntries(await Sentence.find({ language: normalizedLanguage, active: true })
      .select('sentence_id text -_id')
      .sort({ sentence_id: 1 })
      .lean());

    if (corpus.length === 0) {
      corpus = loadCorpusFromLanguageConfig(normalizedLanguage);
    }

    if (corpus.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No sentence corpus found for language: ${normalizedLanguage}`,
      });
    }

    const attemptCount = await SentenceAttempt.countDocuments({
      participant_id,
      study_session_id,
      language: normalizedLanguage,
    });

    const cyclePosition = attemptCount % corpus.length;

    let usedInCurrentCycle = [];
    if (cyclePosition > 0) {
      const recentAttempts = await SentenceAttempt.find({
        participant_id,
        study_session_id,
        language: normalizedLanguage,
      })
        .sort({ created_at: -1 })
        .limit(cyclePosition)
        .select('sentence_id -_id')
        .lean();

      usedInCurrentCycle = recentAttempts.map(s => s.sentence_id);
    }

    const usedSet = new Set(usedInCurrentCycle);
    let available = corpus.filter(s => !usedSet.has(s.sentence_id));

    if (available.length === 0) {
      available = corpus;
    }

    const sentence = pickRandomSentence(available);

    return res.status(200).json({
      success: true,
      sentence,
      corpus_size: corpus.length,
      cycle_position: cyclePosition,
      remaining_in_cycle: available.length - 1,
    });
  } catch (error) {
    console.error('Error fetching next sentence:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch next sentence',
    });
  }
});

router.get('/next-batch', async (req, res) => {
  try {
    const { participant_id, study_session_id, language } = req.query;
    const requestStudyToken = `${req.studyToken || ''}`;
    const requestedBatchSize = parseBatchSize(req.query?.count);

    if (!participant_id || !study_session_id || !language) {
      return res.status(400).json({
        success: false,
        error: 'participant_id, study_session_id and language are required',
      });
    }

    const normalizedLanguage = `${language}`.trim().toLowerCase();
    if (!LANGUAGE_KEYS.has(normalizedLanguage)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
      });
    }

    if (!PARTICIPANT_ID_REGEX.test(`${participant_id}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid participant_id format',
      });
    }

    if (!STUDY_SESSION_ID_REGEX.test(`${study_session_id}`)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid study_session_id format',
      });
    }

    if (!TOKEN_REGEX.test(requestStudyToken)) {
      return res.status(401).json({
        success: false,
        error: 'Valid study token is required',
      });
    }

    const studySession = await StudySession.findOne({
      participant_id,
      study_session_id,
      $or: [
        { link_token: requestStudyToken },
        { link_token: { $exists: false } },
        { link_token: null },
        { link_token: '' },
      ],
    })
      .select('run_config.language_plan')
      .lean();

    if (!studySession) {
      return res.status(403).json({
        success: false,
        error: 'Study session is not authorized for this study token',
      });
    }

    const plannedLanguages = (studySession.run_config?.language_plan || [])
      .map((entry) => `${entry?.language || ''}`.trim().toLowerCase())
      .filter((entry) => LANGUAGE_KEYS.has(entry));

    if (plannedLanguages.length > 0 && !plannedLanguages.includes(normalizedLanguage)) {
      return res.status(403).json({
        success: false,
        error: 'Language is not part of this study session configuration',
      });
    }

    let corpus = normalizeCorpusEntries(await Sentence.find({ language: normalizedLanguage, active: true })
      .select('sentence_id text -_id')
      .sort({ sentence_id: 1 })
      .lean());

    if (corpus.length === 0) {
      corpus = loadCorpusFromLanguageConfig(normalizedLanguage);
    }

    if (corpus.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No sentence corpus found for language: ${normalizedLanguage}`,
      });
    }

    const attemptCount = await SentenceAttempt.countDocuments({
      participant_id,
      study_session_id,
      language: normalizedLanguage,
    });

    const cyclePosition = attemptCount % corpus.length;

    let usedInCurrentCycle = [];
    if (cyclePosition > 0) {
      const recentAttempts = await SentenceAttempt.find({
        participant_id,
        study_session_id,
        language: normalizedLanguage,
      })
        .sort({ created_at: -1 })
        .limit(cyclePosition)
        .select('sentence_id -_id')
        .lean();

      usedInCurrentCycle = recentAttempts.map((entry) => entry.sentence_id);
    }

    const usedSet = new Set(usedInCurrentCycle);
    let available = corpus.filter((entry) => !usedSet.has(entry.sentence_id));
    if (available.length === 0) {
      available = [...corpus];
    }

    const batchSize = Math.min(requestedBatchSize, corpus.length);
    const pool = [...available];
    const selected = [];

    while (selected.length < batchSize && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const [picked] = pool.splice(randomIndex, 1);
      selected.push(picked);
    }

    return res.status(200).json({
      success: true,
      sentences: selected,
      corpus_size: corpus.length,
      cycle_position: cyclePosition,
      remaining_in_cycle: Math.max(available.length - selected.length, 0),
      batch_size: selected.length,
    });
  } catch (error) {
    console.error('Error fetching sentence batch:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sentence batch',
    });
  }
});

router.get('/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const normalizedLanguage = `${language}`.trim().toLowerCase();
    if (!LANGUAGE_KEYS.has(normalizedLanguage)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
      });
    }

    let sentences = normalizeCorpusEntries(await Sentence.find({ language: normalizedLanguage, active: true })
      .select('sentence_id text -_id')
      .sort({ sentence_id: 1 })
      .lean());

    if (sentences.length === 0) {
      sentences = loadCorpusFromLanguageConfig(normalizedLanguage);
    }

    return res.status(200).json({
      success: true,
      language: normalizedLanguage,
      count: sentences.length,
      sentences,
    });
  } catch (error) {
    console.error('Error fetching corpus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch corpus',
    });
  }
});

module.exports = router;
