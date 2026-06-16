const LanguageSummary = ({
  languageName,
  stats,
  hasNextLanguage,
  uiText,
  onDownload,
  onContinue,
  onFinish
}) => {
  const summaryText = uiText.summary;
  const safeStats = stats || {
    wpm: 0,
    rawWpm: 0,
    accuracy: 0,
    errorRate: 0,
    cpm: 0,
    rawCpm: 0,
    consistency: 0,
    durationSeconds: 0,
    sentenceCount: 0,
    keystrokes: 0,
    backspaces: 0,
    errorCorrectionsPercent: 0,
    uncorrectedErrorRate: 0,
    kspc: 0,
    ikiMeanMs: 0,
    keypressDurationMeanMs: 0,
    substitutionErrorRate: 0,
    omissionErrorRate: 0,
    insertionErrorRate: 0,
    correctChars: 0,
    incorrectChars: 0,
    missedChars: 0
  };

  return (
  <div className="screen-container">
    <div className="card">
      <div className="card-header">
        <h2>{languageName} {summaryText.testCompleteSuffix}</h2>
        <p className="subtitle">{summaryText.performanceSummary}</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">{summaryText.wpm}</div>
          <div className="metric-value">{safeStats.wpm}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.rawWpm}</div>
          <div className="metric-value">{safeStats.rawWpm}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.accuracy}</div>
          <div className="metric-value">{safeStats.accuracy}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.errorRate}</div>
          <div className="metric-value">{safeStats.errorRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.uncorrectedError}</div>
          <div className="metric-value">{safeStats.uncorrectedErrorRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.corrections}</div>
          <div className="metric-value">{safeStats.errorCorrectionsPercent}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.kspc}</div>
          <div className="metric-value">{safeStats.kspc}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.ikiMs}</div>
          <div className="metric-value">{safeStats.ikiMeanMs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.keyDurationMs}</div>
          <div className="metric-value">{safeStats.keypressDurationMeanMs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.substitution}</div>
          <div className="metric-value">{safeStats.substitutionErrorRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.omission}</div>
          <div className="metric-value">{safeStats.omissionErrorRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.insertion}</div>
          <div className="metric-value">{safeStats.insertionErrorRate}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.cpm}</div>
          <div className="metric-value">{safeStats.cpm}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.rawCpm}</div>
          <div className="metric-value">{safeStats.rawCpm}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.consistency}</div>
          <div className="metric-value">{safeStats.consistency}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{summaryText.duration}</div>
          <div className="metric-value">{safeStats.durationSeconds}s</div>
        </div>
      </div>

      <div className="stats-panel">
        <div><strong>{summaryText.sentences}:</strong> {safeStats.sentenceCount}</div>
        <div><strong>{summaryText.keystrokes}:</strong> {safeStats.keystrokes}</div>
        <div><strong>{summaryText.backspaces}:</strong> {safeStats.backspaces}</div>
        <div><strong>{summaryText.correctChars}:</strong> {safeStats.correctChars}</div>
        <div><strong>{summaryText.incorrectChars}:</strong> {safeStats.incorrectChars}</div>
        <div><strong>{summaryText.missedChars}:</strong> {safeStats.missedChars}</div>
      </div>

      <button className="btn-secondary btn-large" onClick={onDownload}>
        {summaryText.downloadResults}
      </button>

      {hasNextLanguage ? (
        <button className="btn-primary btn-large" onClick={onContinue}>
          {summaryText.continue}
        </button>
      ) : (
        <button className="btn-primary btn-large" onClick={onFinish}>
          {summaryText.finish}
        </button>
      )}
    </div>
  </div>
  );
};

export default LanguageSummary;
