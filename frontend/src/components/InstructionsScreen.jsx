import React, { useState } from 'react';

const fallbackContent = {
  title: 'Instructions',
  subtitle: 'Please read before continuing',
  body: [
    'This is a placeholder instructions page.',
    'You can replace this content later with your final study instructions.'
  ],
  continueButton: 'Continue to Survey ->',
  acknowledgementLabel: 'I understand and will follow these instructions.'
};

const InstructionsScreen = ({ uiText, onContinue }) => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const content = uiText.instructions || fallbackContent;
  const body = Array.isArray(content.body) ? content.body : fallbackContent.body;

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
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
              <path d="M20 2H8a2 2 0 0 0-2 2v18" />
              <path d="M12 8h4" />
              <path d="M12 12h4" />
            </svg>
          </div>
          <h1>{content.title || fallbackContent.title}</h1>
          <p className="subtitle">{content.subtitle || fallbackContent.subtitle}</p>
        </div>

        <div className="card-body">
          <div className="info-box">
            <ul>
              {body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="consent-checkbox">
            <label>
              <input
                type="checkbox"
                checked={isAcknowledged}
                onChange={(e) => setIsAcknowledged(e.target.checked)}
              />
              <span>{content.acknowledgementLabel || fallbackContent.acknowledgementLabel}</span>
            </label>
          </div>
        </div>

        <button className="btn-primary btn-large" onClick={onContinue} disabled={!isAcknowledged}>
          {content.continueButton || fallbackContent.continueButton}
        </button>
      </div>
    </div>
  );
};

export default InstructionsScreen;
