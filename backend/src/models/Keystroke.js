const mongoose = require('mongoose');

const keystrokeSchema = new mongoose.Schema({
  attempt_id: { type: String, required: true, index: true },
  participant_id: { type: String, required: true, index: true },

  // Raw key event
  event_type: {
    type: String,
    enum: [
      'keydown',
      'keyup',
      'virtual',
      'input',
      'beforeinput',
      'compositionstart',
      'compositionupdate',
      'compositionend'
    ],
    required: true
  },

  key: { type: String },
  code: { type: String },
  event_data: String,
  input_text: String,
  key_codes: String,
  screen_orientation: String,
  device_orientation: String,
  key_location: Number,
  is_repeat: Boolean,

  timestamp: { type: Number, required: true },

  // Core timing features
  keydown_timestamp: Number,
  keyup_timestamp: Number,
  dwell_time: Number,
  flight_time: Number,

  previous_key: String,

  // Modifier state
  is_shift_pressed: Boolean,
  is_caps_lock_on: Boolean,
  shift_or_caps_active: Boolean,
  ctrl_key: Boolean,
  alt_key: Boolean,
  meta_key: Boolean,
  alt_graph_key: Boolean,
  is_composing: Boolean,
  ime_transliteration_active: Boolean,
  input_method: String,
  is_virtual: Boolean,
  input_type: String,
  input_data: String,
  text_delta: mongoose.Schema.Types.Mixed,
  text_length: Number,
  composition_sequence_id: Number,
  composition_data: String,

  // Error behavior
  is_backspace: Boolean,
  is_correction: Boolean,
  error_burst: Boolean,

  // -------------------------
  // Devanagari-specific fields
  // -------------------------

  unicode_value: String,
  unicode_sequence: [String],
  is_virama: Boolean,
  is_consonant: Boolean,
  is_vowel: Boolean,
  is_matra: Boolean,

  matra_type: {
    type: String,
    enum: ['pre_base', 'post_base', 'above', 'below', 'none'],
    default: 'none'
  },

  akshara_index: Number,
  cluster_depth: Number,
  is_cluster_continuation: Boolean,
  grapheme_count: Number,
  inserted_graphemes: [String],
  deleted_graphemes: [String],
  inserted_grapheme_count: Number,
  deleted_grapheme_count: Number,
  grapheme_start_index: Number,
  resulting_grapheme_count: Number,

  // Sentence Attempt-relative
  attempt_time: Number,

  // Device info
  device_type: {
    type: String,
    required: false
  },

  keyboard_layout: {
    type: String,
    enum: ['inscript', 'google_hindi_input', 'qwerty', 'unknown'],
    default: 'inscript'
  },

  user_agent: String,

  created_at: { type: Date, default: Date.now, index: true },
});

keystrokeSchema.index({ attempt_id: 1, timestamp: 1 });

module.exports = mongoose.model('Keystroke', keystrokeSchema);
