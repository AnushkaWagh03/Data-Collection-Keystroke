const mongoose = require('mongoose');

const SURVEY_FIELD_KEYS = [
  'typing_proficiency',
  'primary_device',
  'occupation',
  'age_group',
  'gender',
  'has_taken_typing_course',
  'typing_hours_per_day',
];
const LANGUAGE_KEYS = ['hindi', 'marathi', 'english'];

const normalizeSurveyOrder = (input) => {
  if (!Array.isArray(input)) {
    return [...SURVEY_FIELD_KEYS];
  }

  const filtered = input.filter((field) => SURVEY_FIELD_KEYS.includes(field));
  const deduped = [...new Set(filtered)];
  return deduped;
};

const normalizeLanguagePlan = (input) => {
  const fallback = [{ language: 'hindi', optional: false }];
  if (!Array.isArray(input) || input.length === 0) {
    return fallback;
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of input) {
    const language = `${entry?.language || ''}`.trim().toLowerCase();
    if (!LANGUAGE_KEYS.includes(language) || seen.has(language)) {
      continue;
    }
    seen.add(language);
    normalized.push({
      language,
      optional: Boolean(entry?.optional),
    });
  }

  return normalized.length > 0 ? normalized : fallback;
};

const studyLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]{4,64}$/,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    config: {
      test_language: {
        type: String,
        enum: LANGUAGE_KEYS,
        default: 'hindi',
      },
      language_plan: {
        type: [
          new mongoose.Schema(
            {
              language: {
                type: String,
                enum: LANGUAGE_KEYS,
                required: true,
              },
              optional: {
                type: Boolean,
                default: false,
              },
            },
            { _id: false }
          ),
        ],
        default: [{ language: 'hindi', optional: false }],
        set: normalizeLanguagePlan,
      },
      sentence_count: {
        type: Number,
        min: 1,
        max: 200,
        default: 5,
      },
      virtual_keyboard_enabled: {
        type: Boolean,
        default: false,
      },
      survey_field_order: {
        type: [String],
        default: [...SURVEY_FIELD_KEYS],
        set: normalizeSurveyOrder,
      },
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

studyLinkSchema.statics.SURVEY_FIELD_KEYS = SURVEY_FIELD_KEYS;
studyLinkSchema.statics.normalizeSurveyOrder = normalizeSurveyOrder;
studyLinkSchema.statics.LANGUAGE_KEYS = LANGUAGE_KEYS;
studyLinkSchema.statics.normalizeLanguagePlan = normalizeLanguagePlan;

module.exports = mongoose.model('StudyLink', studyLinkSchema);
