const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  attempt_id: { type: String, required: true, unique: true, index: true },
  participant_id: { type: String, required: true, index: true },
  study_session_id: { type: String, required: true, index: true },
  link_token: { type: String, index: true },
  run_config: mongoose.Schema.Types.Mixed,

  language: {
    type: String,
    enum: ['hindi', 'marathi','english'],
    required: true
  },

  sentence_id: { type: Number, required: true },
  target_sentence: String,
  typed_text: String,
  visibility_mode: {
    type: String,
    enum: ['visible', 'faded', 'blurred', 'hidden', 'timed_reveal'],
    required: true
  },

  attempt_start: Number,
  attempt_end: Number,
  attempt_duration: Number,

  device_type: {
    type: String,
    // enum: ['physical_keyboard'],
    required: true
  },

  keyboard_layout: {
    type: String,
    enum: ['inscript', 'google_hindi_input', 'qwerty', 'unknown'],
    required: false,
    default: 'inscript'
  },

  user_agent: String,
  screen_resolution: String,
  viewport_size: String,
  reveal_count: Number,
  reveal_timestamps: [Number],
  keystroke_count: Number,
  backspace_count: Number,
  error_burst_count: Number,
  window_blur_count: Number,
  suspicious_activity_count: Number,

  performance_metrics: {
    wpm: Number,
    raw_wpm: Number,
    cpm: Number,
    accuracy: Number,
    error_rate: Number,
    uncorrected_error_rate: Number,
    error_corrections_percent: Number,
    kspc: Number,
    iki_mean_ms: Number,
    keypress_duration_mean_ms: Number,

    // Devanagari-specific metrics
    virama_latency_mean_ms: Number,
    cluster_build_time_mean_ms: Number,
    matra_latency_mean_ms: Number,
    akshara_transition_latency_mean_ms: Number,

    substitution_error_rate: Number,
    omission_error_rate: Number,
    insertion_error_rate: Number,
    substitution_error_count: Number,
    omission_error_count: Number,
    insertion_error_count: Number,

    levenshtein_distance: Number,
    analysis_char_length: Number,
    first_to_last_keypress_ms: Number,
  },

  created_at: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('attempt', attemptSchema);
