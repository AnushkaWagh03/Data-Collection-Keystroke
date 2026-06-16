import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'https://localhost').replace(/\/+$/, '');
const studyToken = `${__ENV.STUDY_TOKEN || ''}`.trim().toLowerCase();
const vus = Number(__ENV.VUS || 20);
const duration = __ENV.DURATION || '3m';
const attemptsPerSession = Number(__ENV.ATTEMPTS_PER_SESSION || 5);
const batchSize = Number(__ENV.BATCH_SIZE || 15);
const sentenceLanguage = `${__ENV.LANGUAGE || 'hindi'}`.trim().toLowerCase();
const thinkTimeSeconds = Number(__ENV.THINK_TIME_SECONDS || 0.2);

if (!studyToken) {
  throw new Error('STUDY_TOKEN is required');
}

export const options = {
  scenarios: {
    study_flow: {
      executor: 'constant-vus',
      vus,
      duration,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
  },
};

const buildStudyHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Study-Token': studyToken,
});

const randomSuffix = () => Math.random().toString(36).slice(2, 10);

const createParticipantId = () =>
  `P_${Date.now()}_${__VU}_${__ITER}_${randomSuffix()}`;

const createAttemptId = (participantId, studySessionId, sentenceId, index) =>
  `${participantId}_${studySessionId}_${sentenceId}_${index}_${Date.now()}_${randomSuffix()}`.slice(
    0,
    170
  );

const syntheticTypedText = (sentenceText = '') => `${sentenceText}`.trim();

const buildKeystrokes = (typedText) => {
  const baseTs = Date.now();
  const keystrokes = [];
  let cursorTs = baseTs;
  let previousKey = '';

  for (const char of Array.from(typedText || '')) {
    const keydownTs = cursorTs + 8 + Math.floor(Math.random() * 25);
    const keyupTs = keydownTs + 20 + Math.floor(Math.random() * 40);

    keystrokes.push({
      event_type: 'keydown',
      key: char,
      code: 'KeyA',
      timestamp: keydownTs,
      keydown_timestamp: keydownTs,
      previous_key: previousKey,
      is_backspace: false,
      is_repeat: false,
      shift_or_caps_active: false,
      ctrl_key: false,
      alt_key: false,
      meta_key: false,
      is_virtual: false,
    });

    keystrokes.push({
      event_type: 'keyup',
      key: char,
      code: 'KeyA',
      timestamp: keyupTs,
      keyup_timestamp: keyupTs,
      dwell_time: keyupTs - keydownTs,
      previous_key: previousKey,
      is_backspace: false,
      is_repeat: false,
      shift_or_caps_active: false,
      ctrl_key: false,
      alt_key: false,
      meta_key: false,
      is_virtual: false,
    });

    previousKey = char;
    cursorTs = keyupTs;
  }

  return {
    keystrokes,
    attemptStart: baseTs,
    attemptEnd: Math.max(cursorTs, baseTs + 1),
  };
};

const postJson = (url, body, tags) =>
  http.post(url, JSON.stringify(body), {
    headers: buildStudyHeaders(),
    tags,
  });

const get = (url, tags) =>
  http.get(url, {
    headers: buildStudyHeaders(),
    tags,
  });

export default function () {
  const participantId = createParticipantId();
  const participantPayload = {
    participant_id: participantId,
    link_token: studyToken,
    survey_data: {
      typing_proficiency: 'intermediate',
      typing_proficiency_by_language: { [sentenceLanguage]: 'intermediate' },
      primary_device: 'computer',
      consent: true,
      has_taken_typing_course: false,
    },
    device_info: {
      device_type: 'desktop',
      user_agent: 'k6-loadtest',
      screen_resolution: '1920x1080',
    },
  };

  const upsertParticipant = postJson(
    `${baseUrl}/api/participants`,
    participantPayload,
    { endpoint: 'participants_upsert' }
  );
  const upsertOk = check(upsertParticipant, {
    'participant upsert status 200': (r) => r.status === 200,
  });
  if (!upsertOk) {
    return;
  }

  const startSession = postJson(
    `${baseUrl}/api/participants/${encodeURIComponent(participantId)}/study-sessions/start`,
    { reset_active: false, link_token: studyToken },
    { endpoint: 'study_session_start' }
  );
  const startOk = check(startSession, {
    'study session start status 201': (r) => r.status === 201,
  });
  if (!startOk) {
    return;
  }

  const startPayload = startSession.json();
  const studySessionId = startPayload?.study_session?.study_session_id;
  const runConfig = startPayload?.study_session?.run_config || {};

  if (!studySessionId) {
    return;
  }

  const batchResponse = get(
    `${baseUrl}/api/sentences/next-batch?participant_id=${encodeURIComponent(
      participantId
    )}&study_session_id=${encodeURIComponent(
      studySessionId
    )}&language=${encodeURIComponent(sentenceLanguage)}&token=${encodeURIComponent(
      studyToken
    )}&count=${batchSize}`,
    { endpoint: 'sentences_next_batch' }
  );
  const batchOk = check(batchResponse, {
    'batch status 200': (r) => r.status === 200,
  });
  if (!batchOk) {
    return;
  }

  const sentencePayload = batchResponse.json();
  const sentences = Array.isArray(sentencePayload?.sentences)
    ? sentencePayload.sentences
    : [];
  if (sentences.length === 0) {
    return;
  }

  const attemptsToSend = Math.min(attemptsPerSession, sentences.length);

  for (let i = 0; i < attemptsToSend; i += 1) {
    const sentence = sentences[i];
    const targetSentence = `${sentence?.text || ''}`;
    const typedText = syntheticTypedText(targetSentence);
    const { keystrokes, attemptStart, attemptEnd } = buildKeystrokes(typedText);
    const attemptDuration = Math.max(attemptEnd - attemptStart, 1);

    const attemptPayload = {
      attempt_id: createAttemptId(
        participantId,
        studySessionId,
        sentence?.sentence_id || i + 1,
        i
      ),
      participant_id: participantId,
      study_session_id: studySessionId,
      link_token: studyToken,
      run_config: runConfig,
      language: sentenceLanguage,
      sentence_id: Number(sentence?.sentence_id || i + 1),
      target_sentence: targetSentence,
      typed_text: typedText,
      visibility_mode: 'visible',
      attempt_start: attemptStart,
      attempt_end: attemptEnd,
      attempt_duration: attemptDuration,
      keystrokes,
      window_events: [],
      suspicious_activity: [],
      error_bursts: [],
      reveal_count: 0,
      reveal_timestamps: [],
      device_type: 'desktop',
      user_agent: 'k6-loadtest',
      screen_resolution: '1920x1080',
      viewport_size: '1280x720',
      survey_data: participantPayload.survey_data,
    };

    const saveAttempt = postJson(
      `${baseUrl}/api/attempts`,
      attemptPayload,
      { endpoint: 'attempts_save' }
    );
    const saveOk = check(saveAttempt, {
      'attempt save status 201': (r) => r.status === 201,
    });
    if (!saveOk) {
      return;
    }

    sleep(thinkTimeSeconds);
  }

  postJson(
    `${baseUrl}/api/participants/${encodeURIComponent(
      participantId
    )}/study-sessions/${encodeURIComponent(studySessionId)}`,
    { mark_completed: true, current_stage: 'complete' },
    { endpoint: 'study_session_complete' }
  );
}
