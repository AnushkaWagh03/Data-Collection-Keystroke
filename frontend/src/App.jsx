import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSessionState } from './hooks/useSessionState';
import { useKeystrokeLogger } from './hooks/useKeystrokeLogger';
import LoginScreen from './components/LoginScreen';
import ConsentScreen from './components/ConsentScreen';
import InstructionsScreen from './components/InstructionsScreen';
import SurveyForm from './components/SurveyForm';
import TypingTest from './components/TypingTest';
import CompletionScreen from './components/CompletionScreen';
import LanguageSummary from './components/LanguageSummary';
import LanguageTransition from './components/LanguageTransition';
import AdminPanel from './components/AdminPanel';
import apiService from './services/apiService';
import { createLanguageSequence } from './config/languages';
import { getUiText, uiLanguageOptions } from './config/uiText';
import { aggregateLanguageStats, calculateSentenceStats } from './utils/typingStats';
import {
  getDefaultLayoutIdForLanguage,
  getLayoutIdForKeyboardType
} from './config/keyboards/layouts';
import './styles/global.css';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SURVEY_FIELD_ORDER_DEFAULT = [
  'typing_proficiency',
  'primary_device',
  'occupation',
  'age_group',
  'gender',
  'has_taken_typing_course',
  'typing_hours_per_day'
];

const DEFAULT_RUN_CONFIG = {
  test_language: 'hindi',
  language_plan: [{ language: 'hindi', optional: false }],
  sentence_count: 5,
  virtual_keyboard_enabled: false,
  survey_field_order: SURVEY_FIELD_ORDER_DEFAULT
};
const SENTENCE_BATCH_SIZE = 15;

const normalizeSurveyFieldOrder = (order = []) => {
  if (!Array.isArray(order)) {
    return [...SURVEY_FIELD_ORDER_DEFAULT];
  }
  return [...new Set(order.filter((field) => SURVEY_FIELD_ORDER_DEFAULT.includes(field)))];
};

const normalizeRunConfig = (rawConfig = {}) => ({
  language_plan:
    Array.isArray(rawConfig.language_plan) && rawConfig.language_plan.length > 0
      ? rawConfig.language_plan
          .map((entry) => ({
            language: `${entry?.language || ''}`.trim().toLowerCase(),
            optional: Boolean(entry?.optional)
          }))
          .filter((entry) => ['hindi', 'marathi', 'english'].includes(entry.language))
      : [{
          language: ['hindi', 'marathi', 'english'].includes(rawConfig.test_language)
            ? rawConfig.test_language
            : 'hindi',
          optional: false
        }],
  test_language: ['hindi', 'marathi', 'english'].includes(rawConfig.test_language)
    ? rawConfig.test_language
    : 'hindi',
  sentence_count: Math.max(
    1,
    Math.min(200, Number(rawConfig.sentence_count || DEFAULT_RUN_CONFIG.sentence_count))
  ),
  virtual_keyboard_enabled: Boolean(rawConfig.virtual_keyboard_enabled),
  survey_field_order: normalizeSurveyFieldOrder(rawConfig.survey_field_order)
});

const readTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return (params.get('token') || '').trim().toLowerCase();
};

const syncTokenInUrl = (token) => {
  const url = new URL(window.location.href);
  if (token) {
    url.searchParams.set('token', token);
  } else {
    url.searchParams.delete('token');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

const createAttemptId = (participantId, studySessionId, language, sentenceId) => {
  const safeParticipant = `${participantId || ''}`.trim();
  const safeSession = `${studySessionId || ''}`.trim();
  const safeLanguage = `${language || ''}`.trim().toLowerCase();
  const safeSentenceId = Number.isFinite(Number(sentenceId)) ? Number(sentenceId) : 0;
  const nonce = Math.random().toString(36).slice(2, 8);
  return [
    safeParticipant || 'p',
    safeSession || 'run',
    safeLanguage || 'lang',
    safeSentenceId,
    Date.now(),
    nonce
  ].join('_');
};

const App = () => {
  const isAdminPanelPath = useMemo(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '');
    return pathname === '/admin';
  }, []);

  const [runConfig, setRunConfig] = useState(DEFAULT_RUN_CONFIG);
  const activeLanguageSequence = useMemo(
    () => createLanguageSequence(runConfig.language_plan),
    [runConfig.language_plan]
  );

  const sessionState = useSessionState(activeLanguageSequence.length);

  const [currentSentenceData, setCurrentSentenceData] = useState(null);
  const [sentenceQueue, setSentenceQueue] = useState([]);
  const [currentCorpusSize, setCurrentCorpusSize] = useState(null);
  const [isSentenceLoading, setIsSentenceLoading] = useState(false);
  const [languageSentenceStats, setLanguageSentenceStats] = useState([]);
  const [currentLanguageSummary, setCurrentLanguageSummary] = useState(null);
  const [currentAttemptId, setCurrentAttemptId] = useState('');
  const [copyInfoVisible, setCopyInfoVisible] = useState(false);
  const [uiLanguage, setUiLanguage] = useState(() => {
    const saved = window.localStorage.getItem('ui_language');
    return saved === 'hindi' || saved === 'english' || saved === 'marathi'
      ? saved
      : 'english';
  });

  const [tokenInput, setTokenInput] = useState(() => readTokenFromUrl());
  const [activeLinkToken, setActiveLinkToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [resumeParticipantId, setResumeParticipantId] = useState(() => {
    return (window.localStorage.getItem('participant_id') || '').trim();
  });

  const uiText = useMemo(() => getUiText(uiLanguage), [uiLanguage]);

  const currentLanguageObj =
    activeLanguageSequence[sessionState.currentLanguageIndex] ||
    activeLanguageSequence[0];
  const visibleParticipantId = sessionState.participantId || resumeParticipantId;
  const surveyLanguages = useMemo(
    () => activeLanguageSequence.map((entry) => entry.key),
    [activeLanguageSequence]
  );
  const langConfig = currentLanguageObj.config;
  const {
    currentLanguageIndex,
    setCurrentLanguageIndex,
    setCurrentSentenceIndex
  } = sessionState;
  const isSubmittingAttemptRef = useRef(false);
  const [activeKeyboardLayout, setActiveKeyboardLayout] = useState('inscript');

  useEffect(() => {
    if (currentLanguageIndex > activeLanguageSequence.length - 1) {
      setCurrentLanguageIndex(0);
      setCurrentSentenceIndex(0);
    }
  }, [
    activeLanguageSequence.length,
    currentLanguageIndex,
    setCurrentLanguageIndex,
    setCurrentSentenceIndex
  ]);

  useEffect(() => {
    const keyboardTypes = currentLanguageObj?.config?.keyboard_type || [];
    const firstType = keyboardTypes[0] || '';
    const layoutFromType = getLayoutIdForKeyboardType(firstType);
    const fallbackLayout = getDefaultLayoutIdForLanguage(currentLanguageObj?.key);
    setActiveKeyboardLayout(layoutFromType || fallbackLayout || 'inscript');
  }, [currentLanguageObj?.config?.keyboard_type, currentLanguageObj?.key]);

  const totalSentences = useMemo(() => {
    const configuredCount = Number(runConfig.sentence_count || langConfig.test_sentence_count || 5);
    if (!currentCorpusSize) {
      return configuredCount;
    }
    return Math.min(configuredCount, currentCorpusSize);
  }, [runConfig.sentence_count, langConfig.test_sentence_count, currentCorpusSize]);

  const currentSentence = currentSentenceData?.text || '';

  const applyToken = useCallback(async (rawToken, options = { persistInUrl: true }) => {
    const normalizedToken = `${rawToken || ''}`.trim().toLowerCase();
    if (!normalizedToken) {
      setTokenError('Study token is required.');
      setActiveLinkToken('');
      return false;
    }

    setTokenLoading(true);
    setTokenError('');
    try {
      const result = await apiService.resolveStudyLink(normalizedToken);
      const normalizedConfig = normalizeRunConfig(result.config || {});
      setRunConfig(normalizedConfig);
      setActiveLinkToken(result.token);
      setTokenInput(result.token);
      if (options.persistInUrl !== false) {
        syncTokenInUrl(result.token);
      }
      return true;
    } catch (error) {
      setTokenError(error.message || 'Failed to resolve token');
      setActiveLinkToken('');
      return false;
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlToken = readTokenFromUrl();
    if (!urlToken) {
      return;
    }
    applyToken(urlToken, { persistInUrl: false }).catch(() => {});
  }, [applyToken]);

  useEffect(() => {
    window.localStorage.setItem('ui_language', uiLanguage);
  }, [uiLanguage]);

  const persistStudySessionProgress = useCallback(async (extra = {}) => {
    if (!sessionState.participantId || !sessionState.studySessionId || !activeLinkToken) {
      return;
    }
    try {
      await apiService.updateStudySession(
        sessionState.participantId,
        sessionState.studySessionId,
        {
          current_stage: sessionState.stage,
          current_language_index: sessionState.currentLanguageIndex,
          current_sentence_index: sessionState.currentSentenceIndex,
          ...extra
        },
        activeLinkToken
      );
    } catch (error) {
      console.error('Failed to persist study session progress:', error);
    }
  }, [
    sessionState.participantId,
    sessionState.studySessionId,
    sessionState.stage,
    sessionState.currentLanguageIndex,
    sessionState.currentSentenceIndex,
    activeLinkToken
  ]);

  const fetchNextSentence = useCallback(async () => {
    if (!sessionState.participantId || !sessionState.studySessionId || !activeLinkToken) {
      return;
    }

    if (sentenceQueue.length > 0) {
      const [nextSentence, ...remainingQueue] = sentenceQueue;
      setCurrentSentenceData(nextSentence || null);
      setSentenceQueue(remainingQueue);
      return;
    }

    setIsSentenceLoading(true);
    try {
      const response = await apiService.getNextSentenceBatch(
        sessionState.participantId,
        sessionState.studySessionId,
        currentLanguageObj.key,
        activeLinkToken,
        SENTENCE_BATCH_SIZE
      );
      const queue = Array.isArray(response.sentences) ? response.sentences : [];
      const [nextSentence, ...remainingQueue] = queue;
      setCurrentSentenceData(nextSentence || null);
      setSentenceQueue(remainingQueue);
      setCurrentCorpusSize(response.corpus_size || null);
    } catch (error) {
      console.error('Failed to fetch sentence:', error);
      setCurrentSentenceData(null);
    } finally {
      setIsSentenceLoading(false);
    }
  }, [
    sessionState.participantId,
    sessionState.studySessionId,
    currentLanguageObj.key,
    activeLinkToken,
    sentenceQueue
  ]);

  useEffect(() => {
    if (
      sessionState.stage === 'typing' &&
      !sessionState.isTyping &&
      !currentSentenceData
    ) {
      fetchNextSentence();
    }
  }, [
    sessionState.stage,
    sessionState.isTyping,
    currentSentenceData,
    fetchNextSentence
  ]);

  const keystrokeLogger = useKeystrokeLogger({
    attemptId: currentAttemptId,
    participantId: sessionState.participantId,
    studySessionId: sessionState.studySessionId,
    sentenceId: currentSentenceData?.sentence_id,
    language: currentLanguageObj.key,
    visibilityMode: langConfig.default_visibility_mode,
    keyboardLayout: activeKeyboardLayout
  });

  const handleKeyboardTypeChange = useCallback((keyboardType) => {
    const layoutFromType = getLayoutIdForKeyboardType(keyboardType);
    const fallbackLayout = getDefaultLayoutIdForLanguage(currentLanguageObj.key);
    setActiveKeyboardLayout(layoutFromType || fallbackLayout || 'inscript');
  }, [currentLanguageObj.key]);

  async function handleGenerateNewParticipant() {
    if (!activeLinkToken) {
      throw new Error('Apply a valid study token first.');
    }
    const participantId = sessionState.initializeParticipant();
    await apiService.upsertParticipant(
      participantId,
      sessionState.surveyData,
      {},
      activeLinkToken
    );
    const started = await apiService.startStudySession(participantId, false, activeLinkToken);
    sessionState.resetForNewStudySession(started.study_session, participantId);
    setResumeParticipantId(participantId);
  }

  async function handleResumeParticipant() {
    if (!activeLinkToken) {
      throw new Error('Apply a valid study token first.');
    }

    const participantId = `${resumeParticipantId || ''}`.trim();
    if (!participantId) {
      throw new Error('Participant ID is required to resume.');
    }

    const resumed = await apiService.getActiveStudySession(participantId, activeLinkToken);
    if (!resumed?.study_session) {
      throw new Error('No active session found for this participant.');
    }

    const resumedConfig = normalizeRunConfig(
      resumed.study_session.run_config || runConfig
    );
    setRunConfig(resumedConfig);
    sessionState.hydrateFromStudySession(resumed.study_session, resumed.participant);
    setCurrentSentenceData(null);
    setSentenceQueue([]);
    setCurrentCorpusSize(null);
    setLanguageSentenceStats([]);
    setCurrentLanguageSummary(null);
    setCurrentAttemptId('');
  }

  function handleConsentChange(isAccepted) {
    sessionState.setSurveyData((prev) => ({
      ...prev,
      consent: isAccepted
    }));
  }

  async function handleConsentAccept() {
    sessionState.setStage('instructions');
    await persistStudySessionProgress({ current_stage: 'instructions' });
  }

  async function handleInstructionsContinue() {
    sessionState.setStage('survey');
    await persistStudySessionProgress({ current_stage: 'survey' });
  }

  async function handleSurveySubmit(data) {
    const updatedSurveyData = {
      ...sessionState.surveyData,
      ...data
    };

    sessionState.setSurveyData(updatedSurveyData);

    try {
      await apiService.upsertParticipant(
        sessionState.participantId,
        updatedSurveyData,
        {
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          device_type: /mobile|android|iphone/i.test(navigator.userAgent)
            ? 'mobile'
            : 'desktop'
        },
        activeLinkToken
      );
    } catch (error) {
      console.error('Participant save failed:', error);
    }

    sessionState.setStage('typing');
    await persistStudySessionProgress({
      current_stage: 'typing',
      survey_data: updatedSurveyData
    });
  }

  function handleStartTyping() {
    if (isSentenceLoading || !currentSentence) return;
    const nextAttemptId = createAttemptId(
      sessionState.participantId,
      sessionState.studySessionId,
      currentLanguageObj.key,
      currentSentenceData?.sentence_id
    );

    sessionState.setIsTyping(true);
    sessionState.setTypedText('');
    setCurrentAttemptId(nextAttemptId);
    keystrokeLogger.startSession();
  }

  function handleTypingChange(e) {
    sessionState.setTypedText(e.target.value);
  }

  function handleVirtualKeyPress(button) {
    if (!runConfig.virtual_keyboard_enabled) return;
    keystrokeLogger.logVirtualKey(button);

    sessionState.setTypedText((prev) => {
      switch (button) {
        case '{space}':
          return `${prev} `;
        case '{bksp}':
          return prev.slice(0, -1);
        case '{tab}':
          return `${prev}\t`;
        case '{enter}':
          return `${prev}\n`;
        case '{lbrace}':
          return `${prev}{`;
        case '{rbrace}':
          return `${prev}}`;
        case '{pipe}':
          return `${prev}|`;
        default:
          if (button.startsWith('{') && button.endsWith('}')) {
            return prev;
          }
          return `${prev}${button}`;
      }
    });
  }

  async function handleSubmitSentence() {
    if (isSubmittingAttemptRef.current || !sessionState.isTyping) {
      return;
    }
    isSubmittingAttemptRef.current = true;

    const finalizedSession = keystrokeLogger.endSession();

    if (!finalizedSession || !currentSentenceData) {
      isSubmittingAttemptRef.current = false;
      return;
    }

    const sentenceStats = calculateSentenceStats({
      targetSentence: currentSentence,
      typedText: sessionState.typedText,
      attemptDurationMs: finalizedSession.attempt_duration,
      keystrokes: finalizedSession.keystrokes
    });

    try {
      await apiService.saveAttempt(
        {
          ...finalizedSession,
          link_token: activeLinkToken || undefined,
          run_config: runConfig
        },
        sessionState.surveyData,
        sessionState.typedText,
        currentSentence
      );

    } catch (error) {
      console.error('Failed to save attempt:', error);
    } finally {
      isSubmittingAttemptRef.current = false;
    }

    const updatedStats = [...languageSentenceStats, sentenceStats];
    setLanguageSentenceStats(updatedStats);

    sessionState.resetTyping();

    const isLastSentence =
      sessionState.currentSentenceIndex >= totalSentences - 1;

    if (!isLastSentence) {
      sessionState.nextSentence();
      setCurrentSentenceData(null);
      setCurrentAttemptId('');
      await persistStudySessionProgress({
        current_stage: 'typing',
        current_sentence_index: sessionState.currentSentenceIndex + 1
      });
      await fetchNextSentence();
      return;
    }

    setCurrentLanguageSummary({
      languageName: langConfig.language_name || currentLanguageObj.key,
      ...aggregateLanguageStats(updatedStats)
    });
    setCurrentSentenceData(null);
    setCurrentAttemptId('');
    sessionState.setStage('language-summary');
    await persistStudySessionProgress({ current_stage: 'language-summary' });
  }

  async function handleContinueToNextLanguage() {
    sessionState.nextLanguage();
    sessionState.setStage('typing');
    setCurrentSentenceData(null);
    setSentenceQueue([]);
    setCurrentCorpusSize(null);
    setLanguageSentenceStats([]);
    setCurrentLanguageSummary(null);
    await persistStudySessionProgress({
      current_stage: 'typing',
      current_language_index: sessionState.currentLanguageIndex + 1,
      current_sentence_index: 0
    });
  }

  async function handleShowOptionalLanguageTransition() {
    sessionState.setStage('optional-language-transition');
    await persistStudySessionProgress({
      current_stage: 'optional-language-transition'
    });
  }

  async function handleSkipOptionalLanguage() {
    sessionState.setStage('complete');
    await persistStudySessionProgress({
      current_stage: 'complete',
      mark_completed: true
    });
  }

  async function handleFinishAfterSummary() {
    sessionState.setStage('complete');
    await persistStudySessionProgress({
      current_stage: 'complete',
      mark_completed: true
    });
  }

  async function handleRestart() {
    if (!sessionState.participantId || !activeLinkToken) return;
    const started = await apiService.startStudySession(
      sessionState.participantId,
      false,
      activeLinkToken
    );
    sessionState.resetForNewStudySession(
      started.study_session,
      sessionState.participantId,
      {
        preserveSurveyData: true,
        prefillSurveyData: sessionState.surveyData
      }
    );
    setCurrentSentenceData(null);
    setSentenceQueue([]);
    setCurrentCorpusSize(null);
    setCopyInfoVisible(false);
  }

  async function handleCopyParticipantId() {
    const idToCopy = `${visibleParticipantId || ''}`.trim();
    if (!idToCopy) return;
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopyInfoVisible(true);
      window.setTimeout(() => setCopyInfoVisible(false), 2000);
    } catch (error) {
      console.error('Failed to copy participant id:', error);
    }
  }

  const escapeHtml = (value = '') =>
    `${value}`
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const createParticipationReportHtml = ({
    participantId = '-',
    testToken = '-',
    studySessionId = '-',
    generatedAt = '-'
  }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Participation Report</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px;
      background: #f3f7fb;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #142235;
    }
    .report {
      max-width: 780px;
      margin: 0 auto;
      border: 1px solid #d4e1ec;
      border-radius: 14px;
      background: #fff;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(15, 35, 60, 0.08);
    }
    .header {
      padding: 18px 24px;
      color: #fff;
      background: linear-gradient(135deg, #0f4c81, #14b8a6);
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.95;
    }
    .content {
      padding: 22px 24px;
    }
    .note {
      margin: 0 0 16px;
      padding: 12px 14px;
      border: 1px solid #dce8f2;
      border-radius: 10px;
      background: #f8fcff;
      font-size: 14px;
      line-height: 1.45;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #e3edf5;
      font-size: 14px;
    }
    th {
      width: 220px;
      background: #f7fbff;
      color: #27425b;
      font-weight: 600;
    }
    .footer {
      padding: 14px 24px 20px;
      color: #5f7388;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="header">
      <h1>Participation Verification Report</h1>
      <p>Keystroke Data Collection Study</p>
    </header>
    <section class="content">
      <p class="note">
        Save this report as proof of participation. Keep your Participant ID and Test Token for future reference.
      </p>
      <table aria-label="Participation details">
        <tbody>
          <tr><th>Participant ID</th><td>${escapeHtml(participantId)}</td></tr>
          <tr><th>Test Token</th><td>${escapeHtml(testToken)}</td></tr>
          <tr><th>study session ID</th><td>${escapeHtml(studySessionId)}</td></tr>
          <tr><th>Generated At</th><td>${escapeHtml(generatedAt)}</td></tr>
        </tbody>
      </table>
    </section>
    <footer class="footer">
      This is an auto-generated report from the study application.
    </footer>
  </main>
</body>
</html>`;

  // Ref for the hidden report div
  const reportRef = useRef(null);

  function handleDownloadResults() {
    const reportDiv = reportRef.current;
    if (!reportDiv) return;
    reportDiv.style.display = 'block';
    setTimeout(() => {
      html2canvas(reportDiv, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${visibleParticipantId || 'participant'}_participation_report.pdf`);
        reportDiv.style.display = 'none';
      });
    }, 100);
  }

  const handleTokenApply = useCallback(async (tokenOverride) => {
    const candidateToken =
      typeof tokenOverride === 'string' ? tokenOverride : tokenInput;
    await applyToken(candidateToken);
  }, [applyToken, tokenInput]);

  function renderScreen() {
    switch (sessionState.stage) {
      case 'login':
        return (
          <LoginScreen
            onUseId={handleGenerateNewParticipant}
            onResumeParticipant={handleResumeParticipant}
            resumeParticipantId={resumeParticipantId}
            onResumeParticipantIdChange={setResumeParticipantId}
            tokenValue={tokenInput}
            onTokenChange={setTokenInput}
            onTokenApply={handleTokenApply}
            tokenError={tokenError}
            tokenLoading={tokenLoading}
            hasValidToken={Boolean(activeLinkToken)}
            activeToken={activeLinkToken}
          />
        );
      case 'consent':
        return (
          <ConsentScreen
            uiText={uiText}
            surveyData={sessionState.surveyData}
            onConsentChange={handleConsentChange}
            onAccept={handleConsentAccept}
          />
        );
      case 'instructions':
        return (
          <InstructionsScreen
            uiText={uiText}
            onContinue={handleInstructionsContinue}
          />
        );

      case 'survey':
        return (
          <SurveyForm
            uiText={uiText}
            onSubmit={handleSurveySubmit}
            surveyFieldOrder={runConfig.survey_field_order}
            initialData={sessionState.surveyData}
            languages={surveyLanguages}
          />
        );

      case 'typing':
        return (
          <TypingTest
            config={langConfig}
            currentSentence={currentSentence}
            currentSentenceIndex={
              sessionState.currentSentenceIndex
            }
            totalSentences={totalSentences}
            isTyping={sessionState.isTyping}
            typedText={sessionState.typedText}
            attemptData={keystrokeLogger.attemptData}
            isSentenceLoading={isSentenceLoading}
            onStartTyping={handleStartTyping}
            onTypingChange={handleTypingChange}
            onVirtualKeyPress={handleVirtualKeyPress}
            onKeyboardTypeChange={handleKeyboardTypeChange}
            virtualKeyboardEnabled={runConfig.virtual_keyboard_enabled}
            uiText={uiText}
            onSubmit={handleSubmitSentence}
          />
        );

      case 'language-summary':
        return (
          <LanguageSummary
            languageName={currentLanguageSummary?.languageName}
            stats={currentLanguageSummary}
            hasNextLanguage={sessionState.hasNextLanguage()}
            uiText={uiText}
            onDownload={handleDownloadResults}
            onContinue={
              Boolean(activeLanguageSequence[sessionState.currentLanguageIndex + 1]?.optional)
                ? handleShowOptionalLanguageTransition
                : handleContinueToNextLanguage
            }
            onFinish={handleFinishAfterSummary}
          />
        );
      case 'optional-language-transition':
        return (
          <LanguageTransition
            nextLanguageName={
              activeLanguageSequence[
                sessionState.currentLanguageIndex + 1
              ]?.config?.language_name || ''
            }
            participantId={sessionState.participantId}
            activeToken={activeLinkToken}
            studySessionId={sessionState.studySessionId}
            completedSessionsCount={sessionState.currentLanguageIndex + 1}
            onSkip={handleSkipOptionalLanguage}
            onContinue={handleContinueToNextLanguage}
          />
        );

      case 'complete':
        return (
          <CompletionScreen
            participantId={sessionState.participantId}
            activeToken={activeLinkToken}
            copyInfoVisible={copyInfoVisible}
            uiText={uiText}
            onCopyParticipantId={handleCopyParticipantId}
            onDownloadResults={handleDownloadResults}
            onRestart={handleRestart}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div className="app">
      <div className="brand-header">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="img">
            <defs>
              <linearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0f4c81" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#brandGradient)" />
            <path d="M18 40c4-9 8-11 14-11s10 2 14 11" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="#fff" />
            <circle cx="32" cy="20" r="3" fill="#fff" />
            <circle cx="40" cy="24" r="3" fill="#fff" />
          </svg>
        </div>
        <div className="brand-copy">
          <h1>{uiText.global.appName}</h1>
        </div>
      </div>

      {/* Hidden report for PDF generation */}
      <div
        ref={reportRef}
        id="report-root"
        style={{ display: 'none', position: 'absolute', left: '-9999px', top: 0, width: '800px', background: '#fff', zIndex: -1 }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{
          __html: createParticipationReportHtml({
            participantId: visibleParticipantId || '-',
            testToken: activeLinkToken || '-',
            studySessionId: sessionState.studySessionId || '-',
            generatedAt: new Date().toLocaleString()
          })
        }}
      />

      {!isAdminPanelPath ? (
        <div className="global-language-toggle">
          <label htmlFor="global-ui-language">
            {uiText.global.language}
          </label>
          <select
            id="global-ui-language"
            value={uiLanguage}
            onChange={(e) => setUiLanguage(e.target.value)}
          >
            {uiLanguageOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isAdminPanelPath && visibleParticipantId ? (
        <div className="global-participant-tools">
          <div className="participant-tools-id">
            <strong>{uiText.completion.participantId}:</strong> {visibleParticipantId}
          </div>
          <div className="participant-tools-actions">
            <button type="button" className="btn-secondary" onClick={handleCopyParticipantId}>
              {uiText.completion.copyParticipantId}
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownloadResults}>
              {uiText.completion.downloadResults}
            </button>
          </div>
          {copyInfoVisible ? <div className="copy-info-text">Copied</div> : null}
        </div>
      ) : null}

      {isAdminPanelPath ? <AdminPanel /> : renderScreen()}
    </div>
  );
};

export default App;
