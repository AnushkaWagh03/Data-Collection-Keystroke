const safeDivide = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : 0;

const round = (value, digits = 4) =>
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

const calculateEditOperationCounts = (source = [], target = []) => {
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

const calculateDevanagariTimingMetrics = (keystrokes = []) => {
  const ordered = keystrokes
    .filter((k) => Number.isFinite(Number(k.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const viramaLatencies = [];
  const clusterBuildTimes = [];
  const matraLatencies = [];
  const aksharaTransitionLatencies = [];

  for (let i = 1; i < ordered.length; i += 1) {
    const current = ordered[i];
    const previous = ordered[i - 1];
    const latency = Number(current.timestamp) - Number(previous.timestamp);
    if (!(latency > 0 && latency <= 5000)) {
      continue;
    }

    if (current.is_virama) {
      viramaLatencies.push(latency);
    }
    if (current.is_cluster_continuation) {
      clusterBuildTimes.push(latency);
    }
    if (current.is_matra) {
      matraLatencies.push(latency);
    }

    const currentAkshara = Number(current.akshara_index);
    const previousAkshara = Number(previous.akshara_index);
    if (
      Number.isFinite(currentAkshara) &&
      Number.isFinite(previousAkshara) &&
      currentAkshara > previousAkshara
    ) {
      aksharaTransitionLatencies.push(latency);
    }
  }

  const mean = (samples) =>
    samples.length > 0
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;

  return {
    virama_latency_mean_ms: round(mean(viramaLatencies)),
    cluster_build_time_mean_ms: round(mean(clusterBuildTimes)),
    matra_latency_mean_ms: round(mean(matraLatencies)),
    akshara_transition_latency_mean_ms: round(mean(aksharaTransitionLatencies))
  };
};

const calculatePerformanceMetrics = ({
  targetSentence = '',
  typedText = '',
  attemptDurationMs = 0,
  keystrokes = []
}) => {
  const targetGraphemes = toGraphemes(targetSentence || '');
  const typedGraphemes = toGraphemes(typedText || '');

  const targetChars = targetGraphemes.length;
  const typedChars = typedGraphemes.length;
  const maxChars = Math.max(targetChars, typedChars);

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
      : Math.max(attemptDurationMs, 1);
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
  const devanagariTimingMetrics = calculateDevanagariTimingMetrics(timingKeystrokes);

  const levenshteinDistance = calculateLevenshteinDistance(
    targetGraphemes,
    typedGraphemes
  );
  const editOps = calculateEditOperationCounts(targetGraphemes, typedGraphemes);

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

  const keystrokeCount = timingKeystrokes.length;

  return {
    wpm: round(safeDivide(typedChars / 5, durationMinutes)),
    uncorrected_error_rate: round(
      safeDivide(levenshteinDistance, Math.max(maxChars, 1)) * 100
    ),
    error_corrections_percent: round(
      safeDivide(correctionKeystrokes, keystrokeCount) * 100
    ),
    kspc: round(safeDivide(keystrokeCount, typedChars)),
    iki_mean_ms: round(ikiMeanMs),
    iki_sample_count: ikiValuesMs.length,
    keypress_duration_mean_ms: round(keypressDurationMeanMs),
    keypress_duration_sample_count: keypressDurationsMs.length,
    substitution_error_count: editOps.substitutions,
    omission_error_count: editOps.omissions,
    insertion_error_count: editOps.insertions,
    substitution_error_rate: round(
      safeDivide(editOps.substitutions, Math.max(maxChars, 1)) * 100
    ),
    omission_error_rate: round(
      safeDivide(editOps.omissions, Math.max(maxChars, 1)) * 100
    ),
    insertion_error_rate: round(
      safeDivide(editOps.insertions, Math.max(maxChars, 1)) * 100
    ),
    levenshtein_distance: levenshteinDistance,
    analysis_char_length: maxChars,
    first_to_last_keypress_ms: round(firstToLastDurationMs),
    ...devanagariTimingMetrics
  };
};

module.exports = { calculatePerformanceMetrics };
