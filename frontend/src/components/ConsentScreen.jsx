import React from 'react';

const ConsentScreen = ({
  uiText,
  surveyData,
  onConsentChange,
  onAccept
}) => {
  const content = uiText.consent;

  return (
    <div className="screen-container">
      <div className="card">
        <div className="card-header">
          <div className="icon-circle">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>{content.title}</h1>
          <p className="subtitle">{content.subtitle}</p>
        </div>

        <div className="card-body">
          <div className="info-box">
            <h3>{content.welcomeTitle}</h3>
            <p>{content.welcomeDescription}</p>
          </div>

          <div className="info-box">
            <h4>{content.whatYouWillDoTitle}</h4>
            <ul>
              {content.whatYouWillDoItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="info-box">
            <h4>{content.privacyTitle}</h4>
            <ul>
              {content.privacyItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="consent-checkbox">
            <label>
              <input
                type="checkbox"
                checked={surveyData.consent}
                onChange={(e) => onConsentChange(e.target.checked)}
              />
              <span>{content.consentText}</span>
            </label>
          </div>
        </div>

        <button
          className="btn-primary btn-large"
          disabled={!surveyData.consent}
          onClick={onAccept}
        >
          {content.continueButton}
        </button>
      </div>
    </div>
  );
};

export default ConsentScreen;
