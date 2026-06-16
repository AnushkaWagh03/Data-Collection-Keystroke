import { useEffect, useMemo, useState } from 'react';
import VirtualKeyboard from './VirtualKeyboard';
import { getLayoutIdForKeyboardType } from '../config/keyboards/layouts';

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

const TypingTest = ({
  config,
  currentSentence,
  currentSentenceIndex,
  totalSentences,
  isTyping,
  typedText,
  attemptData,
  isSentenceLoading,
  onStartTyping,
  onTypingChange,
  onVirtualKeyPress,
  onKeyboardTypeChange,
  virtualKeyboardEnabled,
  uiText,
  onSubmit
}) => {
  const typingText = uiText.typing;
  const keyboardTypes = config.keyboard_type || [];
  const [selectedKeyboardType, setSelectedKeyboardType] =
    useState(keyboardTypes[0] || '');

  useEffect(() => {
    setSelectedKeyboardType(keyboardTypes[0] || '');
  }, [config.language]);

  useEffect(() => {
    if (onKeyboardTypeChange) {
      onKeyboardTypeChange(selectedKeyboardType);
    }
  }, [selectedKeyboardType, onKeyboardTypeChange]);

  const showKeyboardSelector = keyboardTypes.length > 1;
  const showVirtualKeyboard = virtualKeyboardEnabled;
  const selectedLayoutId = useMemo(
    () => getLayoutIdForKeyboardType(selectedKeyboardType),
    [selectedKeyboardType]
  );

  const calculateObjectiveErrors = () => {
    const target = toGraphemes(currentSentence || '');
    const typed = toGraphemes(typedText || '');
    const compareLength = Math.min(target.length, typed.length);
    let mismatchCount = 0;

    for (let i = 0; i < compareLength; i += 1) {
      if (typed[i] !== target[i]) {
        mismatchCount += 1;
      }
    }

    const extraChars = Math.max(typed.length - target.length, 0);
    return mismatchCount + extraChars;
  };

  const objectiveErrorCount = calculateObjectiveErrors();

  const progressPercent =
    ((currentSentenceIndex + 1) / totalSentences) * 100;

  const handleInputKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="screen-container">
      <div className="typing-card">
        <div className="progress-section">
          <div className="progress-info">
            <span>{typingText.progress}</span>
            <span className="progress-count">
              {currentSentenceIndex + 1} / {totalSentences}
            </span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="sentence-box">
          <div className="sentence-label">
            {typingText.typeThisSentence}
          </div>
          <p className="typing-guidance">
            {typingText.accuracyInstruction ||
              'Read the sentence carefully, memorize it, then type it as accurately as possible.'}
          </p>

          <div className="sentence-focus">
            <div
              className="sentence-text"
              style={{ fontFamily: config.font_family }}
            >
              {isSentenceLoading ? typingText.loadingSentence : currentSentence}
            </div>
          </div>
        </div>

        {!isTyping ? (
          <div className="center-content">
            <button
              className="btn-start"
              onClick={onStartTyping}
              disabled={isSentenceLoading || !currentSentence}
            >
              {typingText.startTyping}
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="typing-input"
              value={typedText}
              onChange={onTypingChange}
              onKeyDown={handleInputKeyDown}
              style={{ fontFamily: config.font_family }}
              placeholder={typingText.startTypingPlaceholder}
              autoFocus
              spellCheck={false}
            />

            <div className="stats-row">
              <div className="stat">
                <div className="stat-value">
                  {attemptData.keystroke_count}
                </div>
                <div className="stat-label">{typingText.keystrokes}</div>
              </div>

              <div className="stat">
                <div className="stat-value">
                  {attemptData.backspace_count}
                </div>
                <div className="stat-label">{typingText.corrections}</div>
              </div>

              <div className="stat">
                <div className="stat-value">
                  {objectiveErrorCount}
                </div>
                <div className="stat-label">{typingText.objectiveErrors}</div>
              </div>
            </div>

            <button
              className="btn-primary btn-large"
              onClick={onSubmit}
            >
              {currentSentenceIndex < totalSentences - 1
                ? typingText.nextSentence
                : typingText.complete}
            </button>

            {showVirtualKeyboard ? (
              <div className="vk-section">
                <div className="vk-header">
                  <span className="vk-label">{typingText.virtualKeyboard}</span>
                  {showKeyboardSelector ? (
                    <select
                      className="vk-selector"
                      value={selectedKeyboardType}
                      onChange={(e) => setSelectedKeyboardType(e.target.value)}
                    >
                      {keyboardTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <VirtualKeyboard
                  languageKey={config.language}
                  keyboardType={selectedKeyboardType}
                  layoutId={selectedLayoutId}
                  onVirtualKeyPress={onVirtualKeyPress}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default TypingTest;
