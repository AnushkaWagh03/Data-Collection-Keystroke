const safeDivide = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : 0;

const round = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

const TIMING_EVENT_TYPES = new Set(['keyup', 'virtual']);

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
    : null;

const toGraphemes = (value = '') => {
  const text = `${value || ''}`.normalize('NFC');
  if (!text) {
    return [];
  }

  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
};

const isTimingEvent = (event = {}) => {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const eventType = `${event.event_type || ''}`.toLowerCase();
  if (!eventType) {
    return true;
  }

  return TIMING_EVENT_TYPES.has(eventType);
};

const getTimingKeystrokes = (keystrokes = []) =>
  keystrokes.filter(isTimingEvent);

const calculateLevenshteinDistance = (source = [], target = []) => {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[source.length][target.length];
};

const calculateEditOperationCounts = (
  source = [],
  target = []
) => {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  let i = source.length;
  let j = target.length;
  let substitutions = 0;
  let omissions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + cost) {
        if (cost === 1) substitutions += 1;
        i -= 1;
        j -= 1;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      omissions += 1;
      i -= 1;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      insertions += 1;
      j -= 1;
      continue;
    }

    if (i > 0) i -= 1;
    if (j > 0) j -= 1;
  }

  return { substitutions, omissions, insertions };
};

const calculateConsistency = (keystrokes = []) => {
  const timingKeystrokes = getTimingKeystrokes(keystrokes)
    .filter((k) => Number.isFinite(Number(k.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const flights = [];

  for (let i = 0; i < timingKeystrokes.length; i += 1) {
    const current = timingKeystrokes[i];
    const explicitFlight = Number(current.flight_time);

    if (Number.isFinite(explicitFlight) && explicitFlight >= 0) {
      flights.push(explicitFlight);
      continue;
    }

    if (i === 0) {
      continue;
    }

    const previous = timingKeystrokes[i - 1];
    const downTime = Number(current.keydown_timestamp);
    const previousUpTime = Number(previous.keyup_timestamp);
    if (Number.isFinite(downTime) && Number.isFinite(previousUpTime)) {
      const derivedFlight = downTime - previousUpTime;
      if (derivedFlight >= 0) {
        flights.push(derivedFlight);
      }
    }
  }

  if (flights.length < 2) {
    return 100;
  }

  const mean =
    flights.reduce((sum, value) => sum + value, 0) /
    flights.length;

  if (mean === 0) {
    return 100;
  }

  const variance =
    flights.reduce(
      (sum, value) => sum + (value - mean) * (value - mean),
      0
    ) / flights.length;

  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  return Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));
};

const getDwellTimes = (keystrokes = []) =>
  getTimingKeystrokes(keystrokes)
    .map((k) => {
      const explicit = Number(k.dwell_time);
      if (Number.isFinite(explicit) && explicit >= 0) {
        return explicit;
      }

      const downTime = Number(k.keydown_timestamp);
      const upTime = Number(k.keyup_timestamp);
      if (Number.isFinite(downTime) && Number.isFinite(upTime) && upTime >= downTime) {
        return upTime - downTime;
      }

      return null;
    })
    .filter((value) => Number.isFinite(value));

export const calculateSentenceStats = ({
  targetSentence,
  typedText,
  attemptDurationMs,
  keystrokes = []
}) => {
  const target = targetSentence || '';
  const typed = typedText || '';
  const durationMs = Math.max(attemptDurationMs || 0, 1);

  const targetGraphemes = toGraphemes(target);
  const typedGraphemes = toGraphemes(typed);

  const targetChars = targetGraphemes.length;
  const typedChars = typedGraphemes.length;
  const compareLength = Math.min(targetChars, typedChars);
  const maxChars = Math.max(targetChars, typedChars);

  let correctChars = 0;
  for (let i = 0; i < compareLength; i += 1) {
    if (typedGraphemes[i] === targetGraphemes[i]) {
      correctChars += 1;
    }
  }

  const incorrectChars = Math.max(typedChars - correctChars, 0);
  const missedChars = Math.max(targetChars - correctChars, 0);

  const timingKeystrokes = getTimingKeystrokes(keystrokes);
  const timingKeystrokesWithTimestamp = timingKeystrokes
    .filter((k) => Number.isFinite(Number(k.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const firstTimestamp = Number(timingKeystrokesWithTimestamp[0]?.timestamp);
  const lastTimestamp = Number(
    timingKeystrokesWithTimestamp[timingKeystrokesWithTimestamp.length - 1]?.timestamp
  );
  const firstToLastDurationMs =
    Number.isFinite(firstTimestamp) &&
    Number.isFinite(lastTimestamp) &&
    lastTimestamp > firstTimestamp
      ? lastTimestamp - firstTimestamp
      : durationMs;
  const durationMinutes = Math.max(firstToLastDurationMs, 1) / 60000;

  const correctionKeystrokes = timingKeystrokes.filter(
    (k) => k.is_backspace || k.key === 'Backspace' || k.key === 'Delete'
  ).length;

  const ikiValuesMs = [];
  for (let i = 1; i < timingKeystrokesWithTimestamp.length; i += 1) {
    const diff =
      Number(timingKeystrokesWithTimestamp[i].timestamp) -
      Number(timingKeystrokesWithTimestamp[i - 1].timestamp);
    if (diff > 0 && diff <= 5000) {
      ikiValuesMs.push(diff);
    }
  }

  const keypressDurationsMs = getDwellTimes(timingKeystrokes);

  const levenshteinDistance = calculateLevenshteinDistance(
    targetGraphemes,
    typedGraphemes
  );
  const editOps = calculateEditOperationCounts(targetGraphemes, typedGraphemes);

  const keystrokeCount = timingKeystrokes.length;
  const wpm = safeDivide(typedChars / 5, durationMinutes);
  const rawWpm = safeDivide(typedChars / 5, durationMinutes);
  const cpm = safeDivide(correctChars, durationMinutes);
  const rawCpm = safeDivide(typedChars, durationMinutes);
  const accuracy = safeDivide(correctChars, Math.max(typedChars, 1)) * 100;
  const errorRate = safeDivide(incorrectChars + missedChars, Math.max(targetChars, 1)) * 100;
  const uncorrectedErrorRate = safeDivide(levenshteinDistance, Math.max(maxChars, 1)) * 100;
  const errorCorrectionsPercent =
    safeDivide(correctionKeystrokes, keystrokeCount) * 100;
  const kspc = safeDivide(keystrokeCount, typedChars);
  const ikiMeanMs =
    ikiValuesMs.length > 0
      ? ikiValuesMs.reduce((sum, value) => sum + value, 0) /
        ikiValuesMs.length
      : 0;
  const keypressDurationMeanMs =
    keypressDurationsMs.length > 0
      ? keypressDurationsMs.reduce((sum, value) => sum + value, 0) /
        keypressDurationsMs.length
      : 0;
  const consistency = calculateConsistency(timingKeystrokes);

  return {
    durationMs,
    typedChars,
    targetChars,
    correctChars,
    incorrectChars,
    missedChars,
    backspaces: correctionKeystrokes,
    correctionKeystrokes,
    keystrokes: keystrokeCount,
    durationFromFirstToLastMs: firstToLastDurationMs,
    wpm,
    rawWpm,
    cpm,
    rawCpm,
    accuracy,
    errorRate,
    levenshteinDistance,
    uncorrectedErrorRate,
    errorCorrectionsPercent,
    kspc,
    ikiMeanMs,
    ikiSampleCount: ikiValuesMs.length,
    keypressDurationMeanMs,
    keypressDurationSampleCount: keypressDurationsMs.length,
    substitutionErrors: editOps.substitutions,
    omissionErrors: editOps.omissions,
    insertionErrors: editOps.insertions,
    substitutionErrorRate:
      safeDivide(editOps.substitutions, Math.max(maxChars, 1)) * 100,
    omissionErrorRate: safeDivide(editOps.omissions, Math.max(maxChars, 1)) * 100,
    insertionErrorRate: safeDivide(editOps.insertions, Math.max(maxChars, 1)) * 100,
    maxComparisonChars: maxChars,
    consistency
  };
};

export const aggregateLanguageStats = (sentenceStats = []) => {
  const totals = sentenceStats.reduce(
    (acc, stat) => ({
      durationMs: acc.durationMs + stat.durationMs,
      typedChars: acc.typedChars + stat.typedChars,
      targetChars: acc.targetChars + stat.targetChars,
      correctChars: acc.correctChars + stat.correctChars,
      incorrectChars: acc.incorrectChars + stat.incorrectChars,
      missedChars: acc.missedChars + stat.missedChars,
      backspaces: acc.backspaces + stat.backspaces,
      keystrokes: acc.keystrokes + stat.keystrokes,
      levenshteinDistance:
        acc.levenshteinDistance + (stat.levenshteinDistance || 0),
      substitutionErrors:
        acc.substitutionErrors + (stat.substitutionErrors || 0),
      omissionErrors:
        acc.omissionErrors + (stat.omissionErrors || 0),
      insertionErrors:
        acc.insertionErrors + (stat.insertionErrors || 0),
      maxComparisonChars:
        acc.maxComparisonChars + (stat.maxComparisonChars || 0),
      ikiWeightedSum:
        acc.ikiWeightedSum +
        (stat.ikiMeanMs || 0) * (stat.ikiSampleCount || 0),
      ikiSampleCount:
        acc.ikiSampleCount + (stat.ikiSampleCount || 0),
      keypressDurationWeightedSum:
        acc.keypressDurationWeightedSum +
        (stat.keypressDurationMeanMs || 0) *
          (stat.keypressDurationSampleCount || 0),
      keypressDurationSampleCount:
        acc.keypressDurationSampleCount +
        (stat.keypressDurationSampleCount || 0)
    }),
    {
      durationMs: 0,
      typedChars: 0,
      targetChars: 0,
      correctChars: 0,
      incorrectChars: 0,
      missedChars: 0,
      backspaces: 0,
      keystrokes: 0,
      levenshteinDistance: 0,
      substitutionErrors: 0,
      omissionErrors: 0,
      insertionErrors: 0,
      maxComparisonChars: 0,
      ikiWeightedSum: 0,
      ikiSampleCount: 0,
      keypressDurationWeightedSum: 0,
      keypressDurationSampleCount: 0
    }
  );

  const durationMinutes = Math.max(totals.durationMs, 1) / 60000;
  const wpm = safeDivide(totals.typedChars / 5, durationMinutes);
  const rawWpm = safeDivide(totals.typedChars / 5, durationMinutes);
  const cpm = safeDivide(totals.correctChars, durationMinutes);
  const rawCpm = safeDivide(totals.typedChars, durationMinutes);
  const accuracy =
    safeDivide(totals.correctChars, Math.max(totals.typedChars, 1)) * 100;
  const errorRate =
    safeDivide(
      totals.incorrectChars + totals.missedChars,
      Math.max(totals.targetChars, 1)
    ) * 100;
  const uncorrectedErrorRate =
    safeDivide(
      totals.levenshteinDistance,
      Math.max(totals.maxComparisonChars, 1)
    ) * 100;
  const errorCorrectionsPercent =
    safeDivide(totals.backspaces, Math.max(totals.keystrokes, 1)) *
    100;
  const kspc = safeDivide(totals.keystrokes, totals.typedChars);
  const ikiMeanMs = safeDivide(
    totals.ikiWeightedSum,
    totals.ikiSampleCount
  );
  const keypressDurationMeanMs = safeDivide(
    totals.keypressDurationWeightedSum,
    totals.keypressDurationSampleCount
  );

  const substitutionErrorRate =
    safeDivide(
      totals.substitutionErrors,
      Math.max(totals.maxComparisonChars, 1)
    ) * 100;
  const omissionErrorRate =
    safeDivide(
      totals.omissionErrors,
      Math.max(totals.maxComparisonChars, 1)
    ) * 100;
  const insertionErrorRate =
    safeDivide(
      totals.insertionErrors,
      Math.max(totals.maxComparisonChars, 1)
    ) * 100;
  const avgConsistency =
    sentenceStats.length > 0
      ? sentenceStats.reduce((sum, s) => sum + s.consistency, 0) / sentenceStats.length
      : 100;

  return {
    sentenceCount: sentenceStats.length,
    durationSeconds: round(totals.durationMs / 1000, 1),
    wpm: round(wpm),
    rawWpm: round(rawWpm),
    cpm: round(cpm),
    rawCpm: round(rawCpm),
    accuracy: round(accuracy),
    errorRate: round(errorRate),
    uncorrectedErrorRate: round(uncorrectedErrorRate),
    errorCorrectionsPercent: round(errorCorrectionsPercent),
    kspc: round(kspc, 3),
    ikiMeanMs: round(ikiMeanMs, 1),
    ikiSampleCount: totals.ikiSampleCount,
    keypressDurationMeanMs: round(keypressDurationMeanMs, 1),
    keypressDurationSampleCount: totals.keypressDurationSampleCount,
    substitutionErrors: totals.substitutionErrors,
    omissionErrors: totals.omissionErrors,
    insertionErrors: totals.insertionErrors,
    substitutionErrorRate: round(substitutionErrorRate),
    omissionErrorRate: round(omissionErrorRate),
    insertionErrorRate: round(insertionErrorRate),
    consistency: round(avgConsistency),
    typedChars: totals.typedChars,
    targetChars: totals.targetChars,
    correctChars: totals.correctChars,
    incorrectChars: totals.incorrectChars,
    missedChars: totals.missedChars,
    backspaces: totals.backspaces,
    keystrokes: totals.keystrokes,
    levenshteinDistance: totals.levenshteinDistance
  };
};
