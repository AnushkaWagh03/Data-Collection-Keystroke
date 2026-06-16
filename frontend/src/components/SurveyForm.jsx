const FIELD_ORDER_DEFAULT = [
  'typing_proficiency',
  'primary_device',
  'occupation',
  'age_group',
  'gender',
  'has_taken_typing_course',
  'typing_hours_per_day'
];

const SurveyForm = ({
  uiText,
  onSubmit,
  surveyFieldOrder = FIELD_ORDER_DEFAULT,
  initialData = {},
  languages = []
}) => {
  const surveyText = uiText.survey;
  const proficiencyLanguages =
    Array.isArray(languages) && languages.length > 0
      ? [...new Set(languages.map((language) => `${language}`.trim().toLowerCase()))]
      : ['hindi'];
  const normalizedOrder = Array.isArray(surveyFieldOrder)
    ? [...new Set(surveyFieldOrder.filter((field) => FIELD_ORDER_DEFAULT.includes(field)))]
    : [...FIELD_ORDER_DEFAULT];

  const renderField = (fieldKey) => {
    switch (fieldKey) {
      case 'typing_proficiency':
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.typingProficiency}</label>
            {proficiencyLanguages.map((language) => {
              const currentValue =
                initialData?.typing_proficiency_by_language?.[language] ||
                (language === proficiencyLanguages[0]
                  ? initialData.typing_proficiency || ''
                  : '');
              return (
                <div className="form-group" key={`typing_proficiency_${language}`}>
                  <label>{`${language.toUpperCase()} proficiency`}</label>
                  <select
                    name={`typing_proficiency__${language}`}
                    defaultValue={currentValue}
                    required
                  >
                    <option value="">{surveyText.selectPlaceholder}</option>
                    <option value="beginner">
                      {surveyText.proficiencyOptions.beginner}
                    </option>
                    <option value="intermediate">
                      {surveyText.proficiencyOptions.intermediate}
                    </option>
                    <option value="Professional">
                      {surveyText.proficiencyOptions.Professional}
                    </option>
                  </select>
                </div>
              );
            })}
          </div>
        );
      case 'primary_device':
        {
        const normalizedPrimaryDevice =
          initialData.primary_device === 'desktop' || initialData.primary_device === 'laptop'
            ? 'computer'
            : (initialData.primary_device || '');
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.primaryDevice}</label>
            <select name="primary_device" defaultValue={normalizedPrimaryDevice} required>
              <option value="">{surveyText.selectPlaceholder}</option>
              <option value="computer">
                {surveyText.deviceOptions.computer || 'Laptop / Desktop'}
              </option>
              <option value="tablet">{surveyText.deviceOptions.tablet}</option>
              <option value="mobile">{surveyText.deviceOptions.mobile}</option>
            </select>
          </div>
        );
      }
      case 'occupation':
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.occupation}</label>
            <input
              name="occupation"
              defaultValue={initialData.occupation || ''}
              placeholder={surveyText.occupationPlaceholder}
            />
          </div>
        );
      case 'age_group':
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.age}</label>
            <select name="age_group" defaultValue={initialData.age_group || ''}>
              <option value="">{surveyText.preferNotToSay}</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45+">45+</option>
            </select>
          </div>
        );
      case 'gender':
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.gender}</label>
            <select name="gender" defaultValue={initialData.gender || ''}>
              <option value="">{surveyText.preferNotToSay}</option>
              <option value="male">{surveyText.genderOptions.male}</option>
              <option value="female">{surveyText.genderOptions.female}</option>
              <option value="other">{surveyText.genderOptions.other}</option>
            </select>
          </div>
        );
      case 'has_taken_typing_course': {
        const selectedValue =
          typeof initialData.has_taken_typing_course === 'boolean'
            ? String(initialData.has_taken_typing_course)
            : '';
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.typingCourseLabel || 'Have you taken a typing course?'}</label>
            <div className="inline-radio-group">
              <label className="inline-radio-option">
                <input
                  type="radio"
                  name="has_taken_typing_course"
                  value="true"
                  defaultChecked={selectedValue === 'true'}
                />
                <span>{surveyText.yesOption || 'Yes'}</span>
              </label>
              <label className="inline-radio-option">
                <input
                  type="radio"
                  name="has_taken_typing_course"
                  value="false"
                  defaultChecked={selectedValue === 'false'}
                />
                <span>{surveyText.noOption || 'No'}</span>
              </label>
            </div>
            <input
              name="typing_course_language"
              defaultValue={initialData.typing_course_language || ''}
              placeholder={
                surveyText.typingCourseLanguagePlaceholder ||
                'If yes, specify language(s): e.g. English, Hindi'
              }
            />
          </div>
        );
      }
      case 'typing_hours_per_day':
        return (
          <div className="form-group" key={fieldKey}>
            <label>{surveyText.typingHoursPerDayLabel || 'Hours typing/day'}</label>
            {proficiencyLanguages.map((language) => (
              <div className="form-group" key={`typing_hours_per_day_${language}`}>
                <label>{`${language.toUpperCase()} ${surveyText.hoursPerDaySuffix || 'hours/day'}`}</label>
                <input
                  type="number"
                  name={`typing_hours_per_day__${language}`}
                  defaultValue={
                    initialData?.typing_hours_per_day_by_language?.[language] ?? ''
                  }
                  min="0"
                  max="24"
                  step="0.5"
                />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData);
    const typingProficiencyByLanguage = {};
    const typingHoursByLanguage = {};

    for (const language of proficiencyLanguages) {
      const key = `typing_proficiency__${language}`;
      if (rawData[key]) {
        typingProficiencyByLanguage[language] = rawData[key];
      }
      delete rawData[key];

      const hoursKey = `typing_hours_per_day__${language}`;
      if (rawData[hoursKey] !== undefined && rawData[hoursKey] !== '') {
        const parsedHours = Number(rawData[hoursKey]);
        if (Number.isFinite(parsedHours) && parsedHours >= 0 && parsedHours <= 24) {
          typingHoursByLanguage[language] = parsedHours;
        }
      }
      delete rawData[hoursKey];
    }

    if (rawData.has_taken_typing_course === 'true') {
      rawData.has_taken_typing_course = true;
    } else if (rawData.has_taken_typing_course === 'false') {
      rawData.has_taken_typing_course = false;
    } else {
      delete rawData.has_taken_typing_course;
    }

    rawData.typing_course_language = `${rawData.typing_course_language || ''}`.trim();
    if (!rawData.typing_course_language || rawData.has_taken_typing_course !== true) {
      delete rawData.typing_course_language;
    }

    onSubmit({
      ...initialData,
      ...rawData,
      typing_proficiency:
        typingProficiencyByLanguage[proficiencyLanguages[0]] || '',
      typing_proficiency_by_language: typingProficiencyByLanguage,
      typing_hours_per_day_by_language: typingHoursByLanguage
    });
  };

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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h2>{surveyText.title}</h2>
          <p className="subtitle">{surveyText.subtitle}</p>
        </div>

        <form className="survey-form" onSubmit={handleSubmit}>
          {normalizedOrder.map((fieldKey) => renderField(fieldKey))}

          <button type="submit" className="btn-primary btn-large">
            {surveyText.startTypingTest}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SurveyForm;
