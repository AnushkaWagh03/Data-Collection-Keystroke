const mongoose = require('mongoose');

const suspiciousActivitySchema = new mongoose.Schema({
  attempt_id: { type: String, required: true, index: true },
  participant_id: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['paste_attempt', 'paste_detected', 'context_menu'],
    required: true,
  },
  timestamp: { type: Number, required: true },
  key_combination: String,
  clipboard_length: Number,
  metadata: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SuspiciousActivity', suspiciousActivitySchema);
