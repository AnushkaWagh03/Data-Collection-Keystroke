import hindi from './hindi.json';
import english from './english.json';
import marathi from './marathi.json';

export const languageRegistry = {
  hindi,
  english,
  marathi
};

export const defaultLanguageSequence = [{ key: 'hindi', config: hindi, isFinalSurvey: true }];

export const createLanguageSequence = (languagePlan = []) => {
  const sanitized = Array.isArray(languagePlan) ? languagePlan : [];
  const seen = new Set();
  const selected = sanitized
    .map((entry) => ({
      key: `${entry?.language || entry || ''}`.trim().toLowerCase(),
      optional: Boolean(entry?.optional)
    }))
    .filter((entry) => entry.key && !seen.has(entry.key) && languageRegistry[entry.key] && seen.add(entry.key))
    .map((entry) => ({
      key: entry.key,
      optional: entry.optional,
      config: languageRegistry[entry.key]
    }));

  if (selected.length === 0) {
    return defaultLanguageSequence;
  }

  return selected.map((entry, index) => ({
    key: entry.key,
    optional: entry.optional,
    config: entry.config,
    isFinalSurvey: index === selected.length - 1
  }));
};
