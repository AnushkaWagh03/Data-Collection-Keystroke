import { useState, useEffect, useRef, useCallback } from 'react';

const TIMING_EVENT_TYPES = new Set(['keyup', 'virtual']);

const isTimingEvent = (event = {}) =>
  TIMING_EVENT_TYPES.has(`${event.event_type || ''}`.toLowerCase());

const isTextInputTarget = (target) => {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLInputElement) {
    const type = `${target.type || 'text'}`.toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'password'].includes(type);
  }

  return Boolean(target.isContentEditable);
};

const toSafeString = (value) => (typeof value === 'string' ? value : '');

const calculateTextDelta = (beforeText = '', afterText = '') => {
  if (beforeText === afterText) {
    return null;
  }

  const before = toSafeString(beforeText);
  const after = toSafeString(afterText);
  const maxPrefix = Math.min(before.length, after.length);
  let startIndex = 0;

  while (startIndex < maxPrefix && before[startIndex] === after[startIndex]) {
    startIndex += 1;
  }

  let beforeEnd = before.length - 1;
  let afterEnd = after.length - 1;

  while (
    beforeEnd >= startIndex &&
    afterEnd >= startIndex &&
    before[beforeEnd] === after[afterEnd]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  return {
    start_index: startIndex,
    deleted_text: before.slice(startIndex, beforeEnd + 1),
    inserted_text: after.slice(startIndex, afterEnd + 1),
    resulting_length: after.length
  };
};

export const useKeystrokeLogger = ({
  attemptId,
  participantId,
  studySessionId,
  sentenceId,
  language,
  visibilityMode,
  keyboardLayout = 'inscript'
}) => {
  const [keystrokes, setKeystrokes] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [windowEvents, setWindowEvents] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);

  const lastKeyDownTime = useRef({});
  const lastTimingKey = useRef(null);
  const lastKeyUpTime = useRef(null);
  const firstTimingEventTs = useRef(null);
  const lastInputText = useRef('');
  const compositionState = useRef({ active: false, sequenceId: 0 });
  const pendingBeforeInput = useRef(null);
  const inactivityTimer = useRef(null);
  const revealCount = useRef(0);
  const revealTimestamps = useRef([]);
  const correctionSequence = useRef([]);
  const errorBursts = useRef([]);
  const screenOrientationRef = useRef(
    toSafeString(window?.screen?.orientation?.type) || 'unknown'
  );
  const deviceOrientationRef = useRef('unknown');

  const detectErrorBurst = useCallback((keystroke) => {
    if (keystroke.is_backspace) {
      const now = performance.now();
      correctionSequence.current.push(now);

      correctionSequence.current = correctionSequence.current.filter(
        (t) => now - t < 5000
      );

      const recentCorrections = correctionSequence.current.filter(
        (t) => now - t < 2000
      );

      if (recentCorrections.length >= 3) {
        errorBursts.current.push({
          timestamp: now,
          correction_count: recentCorrections.length,
          duration: now - recentCorrections[0]
        });
        return true;
      }
    }

    return false;
  }, []);

  const getDeviceType = useCallback(() => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }, []);

  const getInputMethod = useCallback(() => {
    const platform = navigator.platform;
    if (platform.includes('Mac')) return 'macos_keyboard';
    if (platform.includes('Win')) return 'windows_keyboard';
    if (platform.includes('Linux')) return 'linux_keyboard';
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return 'ios_touchscreen';
    if (/Android/.test(navigator.userAgent)) return 'android_touchscreen';
    return 'unknown';
  }, []);

  const buildModifierState = useCallback((event) => {
    const capsLock =
      typeof event?.getModifierState === 'function'
        ? Boolean(event.getModifierState('CapsLock'))
        : false;
    const altGraph =
      typeof event?.getModifierState === 'function'
        ? Boolean(event.getModifierState('AltGraph'))
        : false;

    return {
      shift: Boolean(event?.shiftKey),
      caps_lock: capsLock,
      ctrl: Boolean(event?.ctrlKey),
      alt: Boolean(event?.altKey),
      meta: Boolean(event?.metaKey),
      alt_graph: altGraph
    };
  }, []);

  const getInputSnapshot = useCallback((target) => {
    if (!target) return '';

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return toSafeString(target.value);
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      return toSafeString(target.textContent);
    }

    return '';
  }, []);

  const getActiveKeyCodesCsv = useCallback((activeCode = null) => {
    const codes = Object.keys(lastKeyDownTime.current || {});
    if (activeCode && !codes.includes(activeCode)) {
      codes.push(activeCode);
    }
    return codes.join(',');
  }, []);

  const getOrientationSnapshot = useCallback(() => {
    const screenOrientation =
      toSafeString(window?.screen?.orientation?.type) ||
      screenOrientationRef.current ||
      'unknown';

    screenOrientationRef.current = screenOrientation;

    return {
      screen_orientation: screenOrientation,
      device_orientation: deviceOrientationRef.current || 'unknown'
    };
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setWindowEvents((prev) => [
        ...prev,
        {
          type: 'inactivity',
          timestamp: performance.now(),
          duration: 5000
        }
      ]);
    }, 5000);
  }, []);

  const pushKeystrokeEvent = useCallback((event) => {
    setKeystrokes((prev) => [...prev, event]);
  }, []);

  const getAttemptRelativeTime = useCallback((timestamp) => {
    const baseline = firstTimingEventTs.current;
    if (Number.isFinite(baseline) && Number.isFinite(timestamp) && timestamp >= baseline) {
      return timestamp - baseline;
    }
    return 0;
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    const key = event.key;
    const code = event.code;

    lastKeyDownTime.current[code] = timestamp;

    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'v') {
      event.preventDefault();
      setSuspiciousActivity((prev) => [
        ...prev,
        {
          type: 'paste_attempt',
          timestamp,
          key_combination: 'Ctrl+V'
        }
      ]);
      return;
    }

    resetInactivityTimer();
  }, [isActive, resetInactivityTimer]);

  const handleKeyUp = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    const key = event.key;
    const code = event.code;
    const inputSnapshot = getInputSnapshot(event.target);
    const downTime = lastKeyDownTime.current[code];
    if (!Number.isFinite(downTime)) return;
    if (!Number.isFinite(firstTimingEventTs.current)) {
      firstTimingEventTs.current = timestamp;
    }

    const modifierState = buildModifierState(event);
    const isBackspace = key === 'Backspace';
    const isCorrection = isBackspace || correctionSequence.current.length > 0;
    const previousKey = lastTimingKey.current;
    const dwellTime = Math.max(timestamp - downTime, 0);
    const flightTime =
      Number.isFinite(lastKeyUpTime.current) && lastKeyUpTime.current <= downTime
        ? Math.max(downTime - lastKeyUpTime.current, 0)
        : null;
    const orientationSnapshot = getOrientationSnapshot();

    const keystrokeEvent = {
      event_type: 'keyup',
      key,
      code,
      timestamp,
      keydown_timestamp: downTime,
      keyup_timestamp: timestamp,
      dwell_time: dwellTime,
      flight_time: flightTime,
      previous_key: previousKey,
      is_backspace: isBackspace,
      is_correction: isCorrection,
      attempt_time: getAttemptRelativeTime(timestamp),
      key_location: Number(event.location || 0),
      is_repeat: Boolean(event.repeat),
      is_composing: Boolean(event.isComposing || compositionState.current.active),
      ime_transliteration_active: Boolean(compositionState.current.active),
      is_shift_pressed: modifierState.shift,
      is_caps_lock_on: modifierState.caps_lock,
      shift_or_caps_active: modifierState.shift || modifierState.caps_lock,
      ctrl_key: modifierState.ctrl,
      alt_key: modifierState.alt,
      meta_key: modifierState.meta,
      alt_graph_key: modifierState.alt_graph,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data: toSafeString(event.data),
      input_text: inputSnapshot,
      key_codes: getActiveKeyCodesCsv(code),
      ...orientationSnapshot
    };

    const isErrorBurst = detectErrorBurst(keystrokeEvent);
    if (isErrorBurst) {
      keystrokeEvent.error_burst = true;
    }

    pushKeystrokeEvent(keystrokeEvent);
    lastTimingKey.current = key;
    lastKeyUpTime.current = timestamp;
    delete lastKeyDownTime.current[code];
  }, [
    buildModifierState,
    detectErrorBurst,
    getDeviceType,
    getInputMethod,
    getInputSnapshot,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleCompositionStart = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    compositionState.current.active = true;
    compositionState.current.sequenceId += 1;
    const timestamp = performance.now();

    pushKeystrokeEvent({
      event_type: 'compositionstart',
      timestamp,
      attempt_time: getAttemptRelativeTime(timestamp),
      composition_sequence_id: compositionState.current.sequenceId,
      composition_data: toSafeString(event.data),
      is_composing: true,
      ime_transliteration_active: true,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data: toSafeString(event.data),
      input_text: getInputSnapshot(event.target),
      key_codes: getActiveKeyCodesCsv(),
      ...getOrientationSnapshot()
    });
  }, [
    getDeviceType,
    getInputMethod,
    getInputSnapshot,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleCompositionUpdate = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    pushKeystrokeEvent({
      event_type: 'compositionupdate',
      timestamp,
      attempt_time: getAttemptRelativeTime(timestamp),
      composition_sequence_id: compositionState.current.sequenceId,
      composition_data: toSafeString(event.data),
      is_composing: true,
      ime_transliteration_active: true,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data: toSafeString(event.data),
      input_text: getInputSnapshot(event.target),
      key_codes: getActiveKeyCodesCsv(),
      ...getOrientationSnapshot()
    });
  }, [
    getDeviceType,
    getInputMethod,
    getInputSnapshot,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleCompositionEnd = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    pushKeystrokeEvent({
      event_type: 'compositionend',
      timestamp,
      attempt_time: getAttemptRelativeTime(timestamp),
      composition_sequence_id: compositionState.current.sequenceId,
      composition_data: toSafeString(event.data),
      is_composing: false,
      ime_transliteration_active: false,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data: toSafeString(event.data),
      input_text: getInputSnapshot(event.target),
      key_codes: getActiveKeyCodesCsv(),
      ...getOrientationSnapshot()
    });

    compositionState.current.active = false;
  }, [
    getDeviceType,
    getInputMethod,
    getInputSnapshot,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleBeforeInput = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    const targetText = toSafeString(event.target?.value);
    pendingBeforeInput.current = {
      input_type: toSafeString(event.inputType),
      input_data: toSafeString(event.data),
      text_snapshot: targetText
    };

    pushKeystrokeEvent({
      event_type: 'beforeinput',
      timestamp,
      attempt_time: getAttemptRelativeTime(timestamp),
      input_type: toSafeString(event.inputType),
      input_data: toSafeString(event.data),
      text_length: targetText.length,
      is_composing: Boolean(event.isComposing || compositionState.current.active),
      ime_transliteration_active: Boolean(compositionState.current.active),
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data: toSafeString(event.data),
      input_text: targetText,
      key_codes: getActiveKeyCodesCsv(),
      ...getOrientationSnapshot()
    });
  }, [
    getDeviceType,
    getInputMethod,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleInput = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    const timestamp = performance.now();
    const nextText = toSafeString(event.target?.value);
    const previousText =
      pendingBeforeInput.current?.text_snapshot ?? lastInputText.current;
    const textDelta = calculateTextDelta(previousText, nextText);

    lastInputText.current = nextText;
    pushKeystrokeEvent({
      event_type: 'input',
      timestamp,
      attempt_time: getAttemptRelativeTime(timestamp),
      input_type:
        toSafeString(event.inputType) ||
        toSafeString(pendingBeforeInput.current?.input_type),
      input_data:
        toSafeString(event.data) ||
        toSafeString(pendingBeforeInput.current?.input_data),
      text_delta: textDelta,
      text_length: nextText.length,
      is_composing: Boolean(event.isComposing || compositionState.current.active),
      ime_transliteration_active: Boolean(compositionState.current.active),
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      keyboard_layout: keyboardLayout,
      event_data:
        toSafeString(event.data) ||
        toSafeString(pendingBeforeInput.current?.input_data),
      input_text: nextText,
      key_codes: getActiveKeyCodesCsv(),
      ...getOrientationSnapshot()
    });

    pendingBeforeInput.current = null;
    resetInactivityTimer();
  }, [
    getDeviceType,
    getInputMethod,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    pushKeystrokeEvent,
    resetInactivityTimer,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const handleWindowBlur = useCallback(() => {
    const timestamp = performance.now();
    setWindowEvents((prev) => [
      ...prev,
      {
        type: 'window_blur',
        timestamp
      }
    ]);
  }, []);

  const handleWindowFocus = useCallback(() => {
    const timestamp = performance.now();
    setWindowEvents((prev) => [
      ...prev,
      {
        type: 'window_focus',
        timestamp
      }
    ]);
  }, []);

  const handlePaste = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    event.preventDefault();
    const timestamp = performance.now();
    setSuspiciousActivity((prev) => [
      ...prev,
      {
        type: 'paste_detected',
        timestamp,
        clipboard_length: event.clipboardData.getData('text').length
      }
    ]);
  }, [isActive]);

  const handleContextMenu = useCallback((event) => {
    if (!isActive || !isTextInputTarget(event.target)) return;

    event.preventDefault();
    const timestamp = performance.now();
    setSuspiciousActivity((prev) => [
      ...prev,
      {
        type: 'context_menu',
        timestamp
      }
    ]);
  }, [isActive]);

  const handleReveal = useCallback(() => {
    const timestamp = performance.now();
    revealCount.current += 1;
    revealTimestamps.current.push(timestamp);

    return {
      reveal_count: revealCount.current,
      reveal_timestamp: timestamp
    };
  }, []);

  const normalizeVirtualButton = useCallback((button) => {
    const map = {
      '{bksp}': { key: 'Backspace', code: 'Backspace' },
      '{space}': { key: ' ', code: 'Space' },
      '{tab}': { key: 'Tab', code: 'Tab' },
      '{enter}': { key: 'Enter', code: 'Enter' },
      '{shift}': { key: 'Shift', code: 'ShiftLeft' },
      '{lock}': { key: 'CapsLock', code: 'CapsLock' },
      '{lbrace}': { key: '{', code: 'BracketLeft' },
      '{rbrace}': { key: '}', code: 'BracketRight' },
      '{pipe}': { key: '|', code: 'Backslash' }
    };

    if (map[button]) return map[button];
    return {
      key: button,
      code: `Virtual-${button}`
    };
  }, []);

  const logVirtualKey = useCallback((button) => {
    if (!isActive) return;

    const timestamp = performance.now();
    const normalized = normalizeVirtualButton(button);
    if (!Number.isFinite(firstTimingEventTs.current)) {
      firstTimingEventTs.current = timestamp;
    }
    const isBackspace = normalized.key === 'Backspace';
    const isCorrection = isBackspace || correctionSequence.current.length > 0;
    const previousKey = lastTimingKey.current;
    const flightTime =
      Number.isFinite(lastKeyUpTime.current) && lastKeyUpTime.current <= timestamp
        ? Math.max(timestamp - lastKeyUpTime.current, 0)
        : null;

    const keystrokeEvent = {
      event_type: 'virtual',
      key: normalized.key,
      code: normalized.code,
      timestamp,
      keydown_timestamp: timestamp,
      keyup_timestamp: timestamp,
      dwell_time: 0,
      flight_time: flightTime,
      previous_key: previousKey,
      is_backspace: isBackspace,
      is_correction: isCorrection,
      attempt_time: getAttemptRelativeTime(timestamp),
      key_location: 0,
      is_repeat: false,
      is_composing: false,
      ime_transliteration_active: Boolean(compositionState.current.active),
      is_shift_pressed: false,
      is_caps_lock_on: false,
      shift_or_caps_active: false,
      ctrl_key: false,
      alt_key: false,
      meta_key: false,
      alt_graph_key: false,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      input_method: getInputMethod(),
      is_virtual: true,
      keyboard_layout: keyboardLayout,
      event_data: normalized.key,
      input_text: lastInputText.current,
      key_codes: getActiveKeyCodesCsv(normalized.code),
      ...getOrientationSnapshot()
    };

    const isErrorBurst = detectErrorBurst(keystrokeEvent);
    if (isErrorBurst) {
      keystrokeEvent.error_burst = true;
    }

    pushKeystrokeEvent(keystrokeEvent);
    lastTimingKey.current = normalized.key;
    lastKeyUpTime.current = timestamp;
    resetInactivityTimer();
  }, [
    detectErrorBurst,
    getDeviceType,
    getInputMethod,
    getActiveKeyCodesCsv,
    getOrientationSnapshot,
    isActive,
    normalizeVirtualButton,
    pushKeystrokeEvent,
    resetInactivityTimer,
    keyboardLayout,
    getAttemptRelativeTime
  ]);

  const startSession = useCallback(() => {
    setIsActive(true);
    setKeystrokes([]);
    setWindowEvents([]);
    setSuspiciousActivity([]);
    correctionSequence.current = [];
    errorBursts.current = [];
    revealCount.current = 0;
    revealTimestamps.current = [];
    lastKeyDownTime.current = {};
    lastTimingKey.current = null;
    lastKeyUpTime.current = null;
    firstTimingEventTs.current = null;
    lastInputText.current = '';
    compositionState.current = { active: false, sequenceId: 0 };
    pendingBeforeInput.current = null;
  }, []);

  const endSession = useCallback(() => {
    setIsActive(false);
    const endTime = performance.now();
    const effectiveStart =
      Number.isFinite(firstTimingEventTs.current) ? firstTimingEventTs.current : null;
    const duration =
      Number.isFinite(effectiveStart) && endTime >= effectiveStart
        ? endTime - effectiveStart
        : 0;

    return {
      attempt_id: attemptId,
      participant_id: participantId,
      study_session_id: studySessionId,
      sentence_id: sentenceId,
      language,
      visibility_mode: visibilityMode,
      keyboard_layout: keyboardLayout,
      attempt_start: effectiveStart,
      attempt_end: endTime,
      attempt_duration: duration,
      keystrokes,
      window_events: windowEvents,
      suspicious_activity: suspiciousActivity,
      error_bursts: errorBursts.current,
      reveal_count: revealCount.current,
      reveal_timestamps: revealTimestamps.current,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`
    };
  }, [
    getDeviceType,
    keystrokes,
    language,
    participantId,
    sentenceId,
    attemptId,
    studySessionId,
    suspiciousActivity,
    visibilityMode,
    windowEvents,
    keyboardLayout
  ]);

  useEffect(() => {
    const updateScreenOrientation = () => {
      screenOrientationRef.current =
        toSafeString(window?.screen?.orientation?.type) ||
        screenOrientationRef.current ||
        'unknown';
    };

    const handleDeviceOrientation = (event) => {
      const alpha = Number(event?.alpha);
      const beta = Number(event?.beta);
      const gamma = Number(event?.gamma);
      if ([alpha, beta, gamma].some((value) => Number.isFinite(value))) {
        const a = Number.isFinite(alpha) ? alpha.toFixed(2) : 'na';
        const b = Number.isFinite(beta) ? beta.toFixed(2) : 'na';
        const g = Number.isFinite(gamma) ? gamma.toFixed(2) : 'na';
        deviceOrientationRef.current = `alpha:${a},beta:${b},gamma:${g}`;
      }
    };

    updateScreenOrientation();
    window.addEventListener('orientationchange', updateScreenOrientation);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateScreenOrientation);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('beforeinput', handleBeforeInput);
    window.addEventListener('input', handleInput);
    window.addEventListener('compositionstart', handleCompositionStart);
    window.addEventListener('compositionupdate', handleCompositionUpdate);
    window.addEventListener('compositionend', handleCompositionEnd);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('beforeinput', handleBeforeInput);
      window.removeEventListener('input', handleInput);
      window.removeEventListener('compositionstart', handleCompositionStart);
      window.removeEventListener('compositionupdate', handleCompositionUpdate);
      window.removeEventListener('compositionend', handleCompositionEnd);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('contextmenu', handleContextMenu);
      clearTimeout(inactivityTimer.current);
    };
  }, [
    handleBeforeInput,
    handleCompositionEnd,
    handleCompositionStart,
    handleCompositionUpdate,
    handleContextMenu,
    handleInput,
    handleKeyDown,
    handleKeyUp,
    handlePaste,
    handleWindowBlur,
    handleWindowFocus,
    isActive
  ]);

  const timingKeystrokeCount = keystrokes.filter(isTimingEvent).length;

  return {
    isActive,
    keystrokes,
    windowEvents,
    suspiciousActivity,
    startSession,
    endSession,
    logVirtualKey,
    handleReveal,
    attemptData: {
      keystroke_count: timingKeystrokeCount,
      backspace_count: keystrokes.filter((k) => isTimingEvent(k) && k.is_backspace).length,
      error_burst_count: errorBursts.current.length,
      reveal_count: revealCount.current,
      suspicious_activity_count: suspiciousActivity.length,
      window_blur_count: windowEvents.filter((e) => e.type === 'window_blur').length
    }
  };
};
