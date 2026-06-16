import React from 'react';

const CompletionScreen = ({
  uiText,
  participantId,
  activeToken,
  copyInfoVisible,
  onCopyParticipantId,
  onDownloadResults,
  onRestart
}) => {
  const completionText = uiText.completion;

  return (
    <div className="screen-container">
      <div className="card center-text">
        <div className="success-icon large">✓</div>
        <h1>{completionText.allDone}</h1>
        <p>{completionText.thankYou}</p>
        <p className="subtitle">
          {completionText.saveInstruction ||
            'Please save this summary to verify you have completed the test.'}
        </p>

        <div className="stats-panel">
          <div>
            <strong>{completionText.participantId}:</strong> {participantId}
            <button
              type="button"
              className="copy-id-btn"
              onClick={onCopyParticipantId}
              aria-label={completionText.copyParticipantId}
              title={completionText.copyParticipantId}
            >
              Copy
            </button>
          </div>
          {copyInfoVisible ? (
            <div className="copy-info-text">
              {completionText.copiedHint || 'Participant ID copied.'}
            </div>
          ) : null}
          <div>
            <strong>Test Token:</strong> {activeToken || '-'}
          </div>
        </div>

        <button className="btn-secondary btn-large" onClick={onDownloadResults}>
          {completionText.downloadResults}
        </button>

        <button className="btn-primary btn-large" onClick={onRestart}>
          Start New Session 
          {/* (Same Participant ID) */}
        </button>
        <p className="action-help">
          Starts another session for participant {participantId}; does not create a new participant.
        </p>
      </div>
    </div>
  );
};

export default CompletionScreen;
