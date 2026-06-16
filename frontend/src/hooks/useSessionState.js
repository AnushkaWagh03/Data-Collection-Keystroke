import { useState, useRef } from 'react';

const createParticipantId = () =>
  `P_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export const useSessionState = (languageCount = 1) => {
  const SURVEY_DEFAULTS = {
    typing_proficiency: '',
    typing_proficiency_by_language: {},
    typing_hours_per_day_by_language: {},
    has_taken_typing_course: null,
    typing_course_language: '',
    primary_device: '',
    occupation: '',
    age_group: '',
    gender: '',
    consent: false
  };

  const [stage, setStage] = useState('login');
  const [participantId, setParticipantId] = useState('');
  const [studySessionId, setStudySessionId] = useState('');
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [completedSessions, setCompletedSessions] = useState([]);

  const [surveyData, setSurveyData] = useState(SURVEY_DEFAULTS);

  const attemptRef = useRef(0);

  const initializeParticipant = (existingId = '') => {
    const id = existingId || createParticipantId();
    setParticipantId(id);
    window.localStorage.setItem('participant_id', id);
    return id;
  };

  const hydrateFromStudySession = (studySession, participant) => {
    if (!studySession) return;
    const resumedParticipantId = participant?.participant_id || '';
    setParticipantId(resumedParticipantId);
    if (resumedParticipantId) {
      window.localStorage.setItem('participant_id', resumedParticipantId);
    }
    setStudySessionId(studySession.study_session_id || '');
    setStage(studySession.current_stage || 'consent');
    setCurrentLanguageIndex(studySession.current_language_index || 0);
    setCurrentSentenceIndex(studySession.current_sentence_index || 0);
    attemptRef.current = studySession.total_sentences_completed || 0;
    setCompletedSessions(Array(studySession.total_sentences_completed || 0).fill('completed'));

    const participantSurvey = participant?.survey_data || {};
    const studySurvey = studySession.survey_data || {};
    setSurveyData({
      ...SURVEY_DEFAULTS,
      ...participantSurvey,
      ...studySurvey
    });
  };

  const resetForNewStudySession = (
    studySession,
    keepParticipantId = '',
    options = {}
  ) => {
    const preserveSurveyData = Boolean(options.preserveSurveyData);
    const prefillSurveyData =
      options.prefillSurveyData && typeof options.prefillSurveyData === 'object'
        ? options.prefillSurveyData
        : {};
    const resolvedParticipantId =
      keepParticipantId || participantId || initializeParticipant();
    setParticipantId(resolvedParticipantId);
    setStudySessionId(studySession?.study_session_id || '');
    setStage('consent');
    setCurrentLanguageIndex(0);
    setCurrentSentenceIndex(0);
    setTypedText('');
    setIsTyping(false);
    setCompletedSessions([]);
    attemptRef.current = 0;
    setSurveyData(
      preserveSurveyData
        ? {
            ...SURVEY_DEFAULTS,
            ...prefillSurveyData
          }
        : SURVEY_DEFAULTS
    );
  };

  const nextSentence = () => {
    setCurrentSentenceIndex(prev => prev + 1);
    attemptRef.current += 1;
  };

  const resetTyping = () => {
    setIsTyping(false);
    setTypedText('');
  };

  const addCompletedSession = (id) => {
    setCompletedSessions(prev => [...prev, id]);
  };

  const hasNextLanguage = () =>
    currentLanguageIndex < Math.max(1, languageCount) - 1;

  const nextLanguage = () => {
    if (hasNextLanguage()) {
      setCurrentLanguageIndex(prev => prev + 1);
      setCurrentSentenceIndex(0);
    }
  };

  return {
    stage,
    setStage,
    participantId,
    setParticipantId,
    studySessionId,
    setStudySessionId,
    initializeParticipant,
    hydrateFromStudySession,
    resetForNewStudySession,
    currentLanguageIndex,
    setCurrentLanguageIndex,
    currentSentenceIndex,
    setCurrentSentenceIndex,
    typedText,
    setTypedText,
    isTyping,
    setIsTyping,
    surveyData,
    setSurveyData,
    completedSessions,
    attemptRef,
    nextSentence,
    resetTyping,
    addCompletedSession,
    hasNextLanguage,
    nextLanguage
  };
};
