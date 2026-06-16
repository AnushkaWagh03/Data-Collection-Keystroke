const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const connectDB = require('../config/database');
const Sentence = require('../models/Sentence');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DEFAULT_MIN_SENTENCE_LENGTH = 1;
const DEFAULT_MAX_SENTENCE_LENGTH = 1000;

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
    : null;

const countGraphemes = (value = '') => {
  const text = `${value || ''}`.normalize('NFC');
  if (!text) {
    return 0;
  }

  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text)).length;
  }

  return Array.from(text).length;
};

const normalizeSentence = (value = '') =>
  `${value || ''}`
    .replace(/\s+/g, ' ')
    .trim();

const parsePositiveInt = (raw, fallback) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const parseArgValue = (name) => {
  const arg = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  if (!arg) {
    return undefined;
  }

  return arg.split('=').slice(1).join('=').trim();
};

function loadLanguageConfig(language) {
  const candidates = [
    path.resolve(__dirname, '../../../frontend/src/config/languages', `${language}.json`),
    path.resolve(__dirname, '../../data/languages', `${language}.json`),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  }

  throw new Error(`Language config not found for "${language}"`);
}

function buildNearTargetCorpus(rawSentences, targetLength, tolerance) {
  const minLength = Math.max(1, targetLength - tolerance);
  const maxLength = targetLength + tolerance;
  const source = rawSentences
    .map((entry) => normalizeSentence(entry))
    .filter(Boolean);

  if (source.length === 0) {
    return [];
  }

  const combined = [];
  let buffer = source[0];

  for (let i = 1; i < source.length; i += 1) {
    const next = source[i];
    const candidate = `${buffer} ${next}`;

    const bufferLen = countGraphemes(buffer);
    const candidateLen = countGraphemes(candidate);

    if (candidateLen <= maxLength) {
      buffer = candidate;
      continue;
    }

    if (
      bufferLen < minLength &&
      Math.abs(candidateLen - targetLength) <= Math.abs(bufferLen - targetLength)
    ) {
      combined.push(candidate);
      buffer = '';
      continue;
    }

    combined.push(buffer);
    buffer = next;
  }

  if (buffer) {
    combined.push(buffer);
  }

  const adjusted = [];
  for (const sentence of combined) {
    const sentenceLen = countGraphemes(sentence);
    if (adjusted.length === 0) {
      adjusted.push(sentence);
      continue;
    }

    if (sentenceLen >= minLength) {
      adjusted.push(sentence);
      continue;
    }

    const previous = adjusted[adjusted.length - 1];
    const merged = `${previous} ${sentence}`;
    const mergedLen = countGraphemes(merged);

    if (
      mergedLen <= maxLength ||
      Math.abs(mergedLen - targetLength) <= Math.abs(sentenceLen - targetLength)
    ) {
      adjusted[adjusted.length - 1] = merged;
    } else {
      adjusted.push(sentence);
    }
  }

  return adjusted;
}

function filterByLengthRange(sentences = [], minLength, maxLength) {
  return sentences.filter((entry) => {
    const length = countGraphemes(entry);
    return length >= minLength && length <= maxLength;
  });
}

function summarizeLengths(sentences = []) {
  const lengths = sentences.map((entry) => countGraphemes(entry));
  if (lengths.length === 0) {
    return { count: 0, min: 0, max: 0, avg: 0 };
  }

  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const avg = lengths.reduce((total, value) => total + value, 0) / lengths.length;

  return {
    count: lengths.length,
    min,
    max,
    avg: Number(avg.toFixed(1)),
  };
}

async function seedLanguage(language, targetLength, tolerance, minLength, maxLength) {
  const config = loadLanguageConfig(language);
  const rawSentences = config.dataset_sentences || [];

  if (rawSentences.length === 0) {
    throw new Error(`No dataset_sentences found for "${language}"`);
  }

  const preparedSentences = buildNearTargetCorpus(
    rawSentences,
    targetLength,
    tolerance
  );
  const rangedSentences = filterByLengthRange(preparedSentences, minLength, maxLength);

  if (rangedSentences.length === 0) {
    throw new Error(
      `No seedable sentences generated for "${language}" in range ${minLength}-${maxLength}`
    );
  }

  const previousCount = await Sentence.countDocuments({ language });

  for (let i = 0; i < rangedSentences.length; i += 1) {
    const sentence_id = i + 1;
    const text = rangedSentences[i];

    await Sentence.findOneAndUpdate(
      { language, sentence_id },
      { language, sentence_id, text, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (previousCount > rangedSentences.length) {
    await Sentence.updateMany(
      { language, sentence_id: { $gt: rangedSentences.length } },
      { $set: { active: false } }
    );
  }

  const summary = summarizeLengths(rangedSentences);
  console.log(
    `Seeded ${summary.count} sentences for ${language} (len min=${summary.min}, max=${summary.max}, avg=${summary.avg})`
  );
}

async function run() {
  const argLanguage = parseArgValue('language');
  const minLength = parsePositiveInt(
    parseArgValue('min-length'),
    DEFAULT_MIN_SENTENCE_LENGTH
  );
  const maxLength = parsePositiveInt(
    parseArgValue('max-length'),
    DEFAULT_MAX_SENTENCE_LENGTH
  );
  const targetLength = parsePositiveInt(
    parseArgValue('target-length'),
    Math.floor((minLength + maxLength) / 2)
  );
  const tolerance = parsePositiveInt(
    parseArgValue('tolerance'),
    Math.ceil((maxLength - minLength) / 2)
  );

  if (targetLength <= tolerance) {
    throw new Error('target-length must be greater than tolerance');
  }
  if (minLength >= maxLength) {
    throw new Error('min-length must be less than max-length');
  }

  const languages = argLanguage
    ? [argLanguage]
    : ['hindi', 'english', 'marathi'];

  try {
    await connectDB();
    for (const language of languages) {
      await seedLanguage(language, targetLength, tolerance, minLength, maxLength);
    }
    console.log(
      `Sentence corpus seed complete (length ${minLength}-${maxLength}, target ${targetLength} +/- ${tolerance})`
    );
    process.exit(0);
  } catch (error) {
    console.error('Sentence corpus seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
