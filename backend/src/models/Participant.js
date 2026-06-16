const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  participant_id: { type: String, required: true, unique: true, index: true },

  created_at: { type: Date, default: Date.now },

  profile: {
    ip_address: String,
    browser_string: String,
    browser_language: String,
    device: String,
    screen_w: Number,
    screen_h: Number,

    age: Number,
    gender: String,
    native_language: String,
    wpm: Number,
    error_rate: Number,
    keyboard_type: String,
    using_app: String,
    using_features: String,
    fingers: String,
    time_spent_typing: Number,
    type_test_lang: String,

    // Typing background
    has_taken_typing_course: Boolean,
    inscript_proficiency: {
      type: String,
      enum: ['none', 'basic', 'intermediate', 'advanced']
    },
    years_using_inscript: Number,
    dominant_typing_language: String,
    average_wpm: Number,
  },

  attempts_completed: { type: Number, default: 0 },
  atttempts_completed: { type: Number, default: 0 },

  survey_data: {
    typing_proficiency: String,
    primary_device: String,
    occupation: String,
    age_group: String,
    gender: String,
    consent: Boolean,
    has_taken_typing_course: Boolean,
    typing_proficiency_by_language: {
      type: Map,
      of: String,
      default: {}
    },
    typing_hours_per_day_by_language: {
      type: Map,
      of: Number,
      default: {}
    }
  },

  source_link_token: String,

  device_info: {
    user_agent: String,
    device_type: {
      type: String,
      // enum: ['physical_keyboard']
    },
    screen_resolution: String
  },
});

module.exports = mongoose.model('Participant', participantSchema);
