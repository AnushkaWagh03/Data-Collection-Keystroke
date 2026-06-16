import React from 'react';

const LanguageTransition = ({
  nextLanguageName,
  participantId,
  activeToken,
  studySessionId,
  completedSessionsCount,
  onSkip,
  onContinue
}) => (
  <div className="screen-container">
    <div className="card center-text">
      <div className="success-icon large">✓</div>
      <h2>Continue to the optional {nextLanguageName} typing test?</h2>
      <p>
        You can skip this optional test and finish now, or continue.
      </p>

      <div className="stats-panel">
        <div><strong>Participation Summary (Current Session)</strong></div>
        <div><strong>Participant ID:</strong> {participantId || '-'}</div>
        <div><strong>Test Token:</strong> {activeToken || '-'}</div>
        <div><strong>Study Session ID:</strong> {studySessionId || '-'}</div>
        <div><strong>Completed Sessions:</strong> {completedSessionsCount || 0}</div>
      </div>

      <div className="button-row">
        <button className="btn-secondary" onClick={onSkip}>
          Skip and Finish
        </button>
        <button className="btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  </div>
);

export default LanguageTransition;
