import { useCallback, useEffect, useState } from 'react';
import apiService from '../services/apiService';

const SURVEY_FIELDS = [
  { key: 'typing_proficiency', label: 'Typing Proficiency' },
  { key: 'primary_device', label: 'Primary Device' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'age_group', label: 'Age Group' },
  { key: 'gender', label: 'Gender' },
  { key: 'has_taken_typing_course', label: 'Typing Course (Yes/No)' },
  { key: 'typing_hours_per_day', label: 'Hours Typing/Day (Per Language)' }
];
const LANGUAGE_OPTIONS = ['hindi', 'marathi', 'english'];
const LANGUAGE_LABELS = {
  hindi: 'हि',
  english: 'En',
  marathi: 'Ma'
};
const normalizeLanguageValue = (value) =>
  LANGUAGE_OPTIONS.includes(`${value || ''}`.trim().toLowerCase())
    ? `${value || ''}`.trim().toLowerCase()
    : 'hindi';
const getLanguageShortLabel = (language) =>
  LANGUAGE_LABELS[normalizeLanguageValue(language)] || 'En';

const buildDefaultDraft = () => ({
  token: '',
  name: '',
  description: '',
  language_plan: [{ language: 'hindi', optional: false }],
  sentence_count: 5,
  virtual_keyboard_enabled: false,
  survey_field_order: SURVEY_FIELDS.map((item) => item.key),
  active: true
});

const normalizeOrder = (order = []) => {
  const safeOrder = Array.isArray(order) ? order : [];
  const filtered = safeOrder.filter((item) =>
    SURVEY_FIELDS.some((field) => field.key === item)
  );
  return [...new Set(filtered)];
};

const fromStudyLink = (studyLink) => ({
  token: studyLink.token || '',
  name: studyLink.name || '',
  description: studyLink.description || '',
  language_plan:
    studyLink.config?.language_plan?.length > 0
      ? studyLink.config.language_plan.map((entry) => ({
          language: normalizeLanguageValue(entry?.language),
          optional: Boolean(entry?.optional)
        }))
      : [{ language: normalizeLanguageValue(studyLink.config?.test_language), optional: false }],
  sentence_count: Number(studyLink.config?.sentence_count || 5),
  virtual_keyboard_enabled: Boolean(studyLink.config?.virtual_keyboard_enabled),
  survey_field_order: normalizeOrder(
    Array.isArray(studyLink.config?.survey_field_order)
      ? studyLink.config.survey_field_order
      : SURVEY_FIELDS.map((item) => item.key)
  ),
  active: Boolean(studyLink.active)
});

const moveInArray = (arr, index, direction) => {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= arr.length) {
    return arr;
  }

  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [studyLinks, setStudyLinks] = useState([]);
  const [editingToken, setEditingToken] = useState('');
  const [draft, setDraft] = useState(buildDefaultDraft);

  const fetchStudyLinks = useCallback(async () => {
    const result = await apiService.adminGetStudyLinks();
    setStudyLinks(result.study_links || []);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    fetchStudyLinks().catch(() => {
      setIsAuthenticated(false);
    });
  }, [fetchStudyLinks]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiService.adminLogin(password);
      setPassword('');
      await fetchStudyLinks();
    } catch (loginError) {
      setError(loginError.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    let logoutErrorMessage = '';
    try {
      await apiService.adminLogout();
    } catch (logoutError) {
      logoutErrorMessage = logoutError.message || 'Admin logout failed';
    }
    setIsAuthenticated(false);
    setStudyLinks([]);
    setEditingToken('');
    setDraft(buildDefaultDraft());
    setError(logoutErrorMessage);
    setSuccess('');
  };

  const handleEdit = (studyLink) => {
    setEditingToken(studyLink.token);
    setDraft(fromStudyLink(studyLink));
    setError('');
    setSuccess('');
  };

  const resetDraft = () => {
    setEditingToken('');
    setDraft(buildDefaultDraft());
    setError('');
    setSuccess('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return;

    const payload = {
      token: draft.token.trim().toLowerCase(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      active: draft.active,
      config: {
        language_plan: draft.language_plan,
        sentence_count: Number(draft.sentence_count || 5),
        virtual_keyboard_enabled: Boolean(draft.virtual_keyboard_enabled),
        survey_field_order: normalizeOrder(draft.survey_field_order)
      }
    };

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingToken) {
        await apiService.adminUpdateStudyLink(editingToken, payload);
        setSuccess('Study link updated.');
      } else {
        await apiService.adminCreateStudyLink(payload);
        setSuccess('Study link created.');
      }
      await fetchStudyLinks();
      setEditingToken('');
      setDraft(buildDefaultDraft());
    } catch (saveError) {
      setError(saveError.message || 'Failed to save study link');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (studyLink) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiService.adminSetStudyLinkActive(studyLink.token, !studyLink.active);
      await fetchStudyLinks();
    } catch (toggleError) {
      setError(toggleError.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (shareUrl) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccess('Share link copied.');
      setError('');
    } catch {
      setError('Could not copy the link automatically.');
    }
  };

  const handleDeleteLink = async (studyLink) => {
    if (!isAuthenticated) return;
    const confirmed = window.confirm(
      `Delete study link "${studyLink.name}" (${studyLink.token})? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiService.adminDeleteStudyLink(studyLink.token);
      if (editingToken === studyLink.token) {
        resetDraft();
      }
      await fetchStudyLinks();
      setSuccess('Study link deleted.');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete study link');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="screen-container">
        <div className="card">
          <div className="card-header">
            <h2>Admin Access</h2>
            <p className="subtitle">
              Enter admin password to manage token-based study links.
            </p>
          </div>
          <form className="card-body" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="admin-password">Admin Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container admin-layout">
      <div className="admin-header-row">
        <h2>Study Link Admin</h2>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="admin-success-text">{success}</p> : null}

      <div className="admin-grid">
        <div className="card">
          <div className="card-header">
            <h3>{editingToken ? 'Edit Study Link' : 'Create Study Link'}</h3>
          </div>
          <form onSubmit={handleSave}>
            {!editingToken ? (
              <div className="form-group">
                <label>Token (optional)</label>
                <input
                  value={draft.token}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, token: e.target.value }))
                  }
                  placeholder="auto-generated if blank"
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Token</label>
                <input value={draft.token} disabled />
              </div>
            )}

            <div className="form-group">
              <label>Name</label>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                value={draft.description}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Language Plan (Order + Optional)</label>
              <div className="admin-order-list">
                {draft.language_plan.map((item, index) => (
                  <div className="admin-order-item" key={`${item.language}-${index}`}>
                    <select
                      value={normalizeLanguageValue(item.language)}
                      onChange={(e) =>
                        setDraft((prev) => {
                          const next = [...prev.language_plan];
                          next[index] = {
                            ...next[index],
                            language: normalizeLanguageValue(e.target.value)
                          };
                          return { ...prev, language_plan: next };
                        })
                      }
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {getLanguageShortLabel(language)}
                        </option>
                      ))}
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(item.optional)}
                        onChange={(e) =>
                          setDraft((prev) => {
                            const next = [...prev.language_plan];
                            next[index] = { ...next[index], optional: e.target.checked };
                            return { ...prev, language_plan: next };
                          })
                        }
                      />
                      Optional
                    </label>
                    <div className="admin-order-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            language_plan: moveInArray(prev.language_plan, index, 'up')
                          }))
                        }
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            language_plan: moveInArray(prev.language_plan, index, 'down')
                          }))
                        }
                        disabled={index === draft.language_plan.length - 1}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            language_plan:
                              prev.language_plan.length > 1
                                ? prev.language_plan.filter((_, i) => i !== index)
                                : prev.language_plan
                          }))
                        }
                        disabled={draft.language_plan.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    language_plan: [
                      ...prev.language_plan,
                      { language: 'english', optional: true }
                    ]
                  }))
                }
              >
                Add Language
              </button>
            </div>

            <div className="form-group">
              <label>Sentence Count</label>
              <input
                type="number"
                min="1"
                max="200"
                value={draft.sentence_count}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    sentence_count: Number(e.target.value || 1)
                  }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(draft.virtual_keyboard_enabled)}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      virtual_keyboard_enabled: e.target.checked
                    }))
                  }
                />
                Enable Virtual Keyboard
              </label>
            </div>

            <div className="form-group">
              <label>Survey Fields</label>
              <div className="admin-order-list">
                {SURVEY_FIELDS.map((field) => {
                  const enabled = draft.survey_field_order.includes(field.key);
                  return (
                    <div className="admin-order-item" key={`toggle-${field.key}`}>
                      <span>{field.label}</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) =>
                            setDraft((prev) => {
                              if (e.target.checked) {
                                return {
                                  ...prev,
                                  survey_field_order: normalizeOrder([
                                    ...prev.survey_field_order,
                                    field.key
                                  ])
                                };
                              }
                              return {
                                ...prev,
                                survey_field_order: prev.survey_field_order.filter(
                                  (key) => key !== field.key
                                )
                              };
                            })
                          }
                        />
                        Enabled
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Survey Field Order (Enabled Fields)</label>
              <div className="admin-order-list">
                {draft.survey_field_order.map((fieldKey, index) => {
                  const label =
                    SURVEY_FIELDS.find((field) => field.key === fieldKey)?.label ||
                    fieldKey;
                  return (
                    <div className="admin-order-item" key={fieldKey}>
                      <span>{label}</span>
                      <div className="admin-order-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              survey_field_order: moveInArray(
                                prev.survey_field_order,
                                index,
                                'up'
                              )
                            }))
                          }
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              survey_field_order: moveInArray(
                                prev.survey_field_order,
                                index,
                                'down'
                              )
                            }))
                          }
                          disabled={index === draft.survey_field_order.length - 1}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                  );
                })}
                {draft.survey_field_order.length === 0 ? (
                  <p className="action-help">No survey fields enabled.</p>
                ) : null}
              </div>
            </div>

            <div className="button-row">
              <button type="submit" className="btn-primary" disabled={loading}>
                {editingToken ? 'Save Changes' : 'Create Link'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetDraft}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="card admin-list-card">
          <div className="card-header">
            <h3>Configured Links</h3>
          </div>
          <div className="admin-link-list">
            {studyLinks.length === 0 ? (
              <p>No study links created yet.</p>
            ) : (
              studyLinks.map((studyLink) => (
                <div className="admin-link-item" key={studyLink.token}>
                  <div className="admin-link-meta">
                    <h4>{studyLink.name}</h4>
                    <p>
                      <strong>Token:</strong> {studyLink.token}
                    </p>
                    <p>
                      <strong>Languages:</strong>{' '}
                      {(studyLink.config?.language_plan || [])
                        .map((item) => `${getLanguageShortLabel(item.language)}${item.optional ? ' (optional)' : ''}`)
                        .join(' -> ')}
                    </p>
                    <p>
                      <strong>Virtual Keyboard:</strong>{' '}
                      {studyLink.config?.virtual_keyboard_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p>
                      <strong>Sentences:</strong> {studyLink.config?.sentence_count}
                    </p>
                    <p>
                      <strong>Status:</strong> {studyLink.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleCopyLink(studyLink.share_url)}
                    >
                      Copy Share Link
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleEdit(studyLink)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleToggleActive(studyLink)}
                    >
                      {studyLink.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteLink(studyLink)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
