import React, { useState } from 'react';

const LoginScreen = ({
  onUseId,
  onResumeParticipant,
  resumeParticipantId,
  onResumeParticipantIdChange,
  tokenValue,
  onTokenChange,
  onTokenApply,
  tokenError,
  tokenLoading,
  hasValidToken,
  activeToken
}) => {
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!hasValidToken) {
      setError('Apply a valid study token first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onUseId();
    } catch (e) {
      setError(e.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!hasValidToken) {
      setError('Apply a valid study token first.');
      return;
    }

    setResumeLoading(true);
    setError('');
    try {
      await onResumeParticipant();
    } catch (e) {
      setError(e.message || 'Failed to resume session');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleTokenPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    const normalized = `${pasted}`.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    e.preventDefault();
    onTokenChange(normalized);
    onTokenApply(normalized);
  };

  const handleTokenKeyDown = (e) => {
    if (e.key !== 'Enter') {
      return;
    }

    e.preventDefault();
    onTokenApply(e.currentTarget.value);
  };

  return (
    <div className="screen-container">
      <div className="card">
        <div className="card-header">
          <h1>Participant Login</h1>
          <p className="subtitle">Enter your study token to begin.</p>
        </div>

        <div className="card-body">
          <div className="form-group">
            <label>Study Token</label>
            <div className="token-input-row">
              <input
                value={tokenValue}
                onChange={(e) => onTokenChange(e.target.value)}
                onPaste={handleTokenPaste}
                onKeyDown={handleTokenKeyDown}
                placeholder="for example: marathi-batch-a"
              />
              <button
                type="button"
                className="token-apply-icon-btn"
                disabled={tokenLoading}
                onClick={() => onTokenApply(tokenValue)}
                aria-label="Apply token"
                title="Apply token (Enter)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M5 12h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {activeToken ? (
            <p className="subtitle">Active token: <strong>{activeToken}</strong></p>
          ) : null}
          {tokenError ? <p className="error-text">{tokenError}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          <button
            type="button"
            className="btn-primary"
            disabled={loading || !hasValidToken}
            onClick={handleStart}
          >
            Start Study Session
          </button>
          <p className="action-help">
            A fresh participant ID and study session will be generated automatically.
          </p>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Participant ID (Resume)</label>
            <input
              value={resumeParticipantId}
              onChange={(e) => onResumeParticipantIdChange(e.target.value)}
              placeholder="for example: P_1709987612000_ab12cd34"
            />
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={resumeLoading || !hasValidToken}
            onClick={handleResume}
          >
            Resume Existing Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
