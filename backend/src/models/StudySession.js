const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  study_session_id: { type: String, required: true, unique: true, index: true },
  participant_id: { type: String, required: true, index: true },

  status: {
    type: String,
    enum: ['active', 'completed', 'reset'],
    default: 'active',
    index: true,
  },

  current_stage: {
    type: String,
    enum: ['consent', 'survey', 'typing', 'complete'],
    default: 'consent',
  },

  current_language_index: { type: Number, default: 0 },
  current_sentence_index: { type: Number, default: 0 },
  total_sentences_completed: { type: Number, default: 0 },
  link_token: { type: String, index: true },

  // Strict experiment config snapshot
  run_config: {
    test_language: {
      type: String,
      enum: ['hindi', 'marathi', 'english'],
      default: 'hindi',
    },
    language_plan: {
      type: [
        new mongoose.Schema(
          {
            language: {
              type: String,
              enum: ['hindi', 'marathi', 'english'],
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
    },

    sentence_count: {
      type: Number,
      min: 1,
      max: 200,
      default: 5,
    },

    keyboard_layout: {
      type: String,
      enum: ['inscript', 'google_hindi_input', 'qwerty', 'unknown'],
      required: false,
      default: 'inscript',
    },

    device_type: {
      type: String,
      // enum: ['physical_keyboard'],
      default: 'physical_keyboard',
    },

    layout_version: String,
    os_language: String,
    browser_language: String,
    virtual_keyboard_enabled: {
      type: Boolean,
      default: false,
    },
    survey_field_order: [String],
  },

  sentence_counts_by_language: {
    type: Map,
    of: Number,
    default: {},
  },

  survey_data: {
    typing_proficiency: String,
    typing_proficiency_by_language: {
      type: Map,
      of: String,
      default: {},
    },
    typing_hours_per_day_by_language: {
      type: Map,
      of: Number,
      default: {},
    },
    has_taken_typing_course: Boolean,
    inscript_proficiency: {
      type: String,
      enum: ['none', 'basic', 'intermediate', 'advanced']
    },
    years_using_inscript: Number,
    primary_device: String,
    occupation: String,
    age_group: String,
    gender: String,
    consent: Boolean,
  },

  active: { type: Boolean, default: true, index: true },

  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  last_activity_at: { type: Date, default: Date.now },
  reset_at: { type: Date },
});

studySessionSchema.index({ participant_id: 1, active: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
