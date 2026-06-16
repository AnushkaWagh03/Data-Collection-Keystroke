const buildStudyHeaders = (studyToken, extraHeaders = {}) => ({
  ...extraHeaders,
  'X-Study-Token': `${studyToken || ''}`.trim().toLowerCase()
});

const assertStudyToken = (studyToken) => {
  if (!`${studyToken || ''}`.trim()) {
    throw new Error('A valid study token is required.');
  }
};

const apiService = {
  async upsertParticipant(participantId, surveyData, deviceInfo = {}, linkToken = '') {
    assertStudyToken(linkToken);
    const response = await fetch('/api/participants', {
      method: 'POST',
      headers: buildStudyHeaders(linkToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        participant_id: participantId,
        survey_data: surveyData,
        device_info: deviceInfo,
        link_token: linkToken || undefined
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create/update participant');
    }

    return response.json();
  },

  async startStudySession(participantId, resetActive = false, linkToken = '') {
    assertStudyToken(linkToken);
    const response = await fetch(`/api/participants/${participantId}/study-sessions/start`, {
      method: 'POST',
      headers: buildStudyHeaders(linkToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        reset_active: resetActive,
        link_token: linkToken || undefined
      })
    });
    if (!response.ok) {
      throw new Error('Failed to start study session');
    }
    return response.json();
  },

  async getActiveStudySession(participantId, linkToken = '') {
    assertStudyToken(linkToken);
    const response = await fetch(`/api/participants/${participantId}/study-sessions/active`, {
      headers: buildStudyHeaders(linkToken)
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to resume study session');
    }
    return response.json();
  },

  async updateStudySession(participantId, studySessionId, updates, linkToken) {
    assertStudyToken(linkToken);
    const response = await fetch(
      `/api/participants/${participantId}/study-sessions/${studySessionId}`,
      {
        method: 'PATCH',
        headers: buildStudyHeaders(linkToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(updates || {})
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update study session');
    }
    return response.json();
  },

  async getNextSentence(participantId, studySessionId, language, linkToken) {
    assertStudyToken(linkToken);
    const params = new URLSearchParams({
      participant_id: participantId,
      study_session_id: studySessionId,
      language,
      token: `${linkToken || ''}`.trim().toLowerCase()
    });

    const response = await fetch(`/api/sentences/next?${params.toString()}`, {
      headers: buildStudyHeaders(linkToken)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch next sentence');
    }

    return response.json();
  },

  async getNextSentenceBatch(
    participantId,
    studySessionId,
    language,
    linkToken,
    count = 15
  ) {
    assertStudyToken(linkToken);
    const params = new URLSearchParams({
      participant_id: participantId,
      study_session_id: studySessionId,
      language,
      token: `${linkToken || ''}`.trim().toLowerCase(),
      count: String(count)
    });

    const response = await fetch(`/api/sentences/next-batch?${params.toString()}`, {
      headers: buildStudyHeaders(linkToken)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch sentence batch');
    }

    return response.json();
  },

  async saveAttempt(attempt, surveyData, typedText, targetSentence) {
    const linkToken = attempt?.link_token || '';
    assertStudyToken(linkToken);
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: buildStudyHeaders(linkToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...attempt,
        survey_data: surveyData,
        typed_text: typedText,
        target_sentence: targetSentence
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to save sentence attempt');
    }

    return response.json();
  },

  async resolveStudyLink(token) {
    const response = await fetch(`/api/study-links/${encodeURIComponent(token)}`);
    if (!response.ok) {
      throw new Error('Invalid or inactive token');
    }
    return response.json();
  },

  async adminLogin(password) {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      throw new Error('Admin login failed');
    }

    return response.json();
  },

  async adminLogout() {
    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Admin logout failed');
    }

    return response.json();
  },

  async adminGetStudyLinks() {
    const response = await fetch('/api/admin/study-links', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch study links');
    }

    return response.json();
  },

  async adminCreateStudyLink(payload) {
    const response = await fetch('/api/admin/study-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to create study link');
    }

    return response.json();
  },

  async adminUpdateStudyLink(token, payload) {
    const response = await fetch(`/api/admin/study-links/${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to update study link');
    }

    return response.json();
  },

  async adminSetStudyLinkActive(token, active) {
    const response = await fetch(`/api/admin/study-links/${encodeURIComponent(token)}/active`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ active })
    });

    if (!response.ok) {
      throw new Error('Failed to update link status');
    }

    return response.json();
  },

  async adminDeleteStudyLink(token) {
    const response = await fetch(`/api/admin/study-links/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete study link');
    }

    return response.json();
  }
};

export default apiService;
