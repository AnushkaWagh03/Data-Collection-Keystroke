const mongoose = require('mongoose');

const windowEventSchema = new mongoose.Schema({
  attempt_id: { type: String, required: true, index: true },
  participant_id: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['window_blur', 'window_focus', 'inactivity'],
    required: true,
  },
  timestamp: { type: Number, required: true },
  duration: Number,
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WindowEvent', windowEventSchema);