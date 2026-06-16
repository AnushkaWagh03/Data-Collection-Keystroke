const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  language: { type: String, required: true, index: true },
  sentence_id: { type: Number, required: true },
  text: { type: String, required: true },
  source: { type: String, default: 'corpus' },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

sentenceSchema.index({ language: 1, sentence_id: 1 }, { unique: true });

module.exports = mongoose.model('Sentence', sentenceSchema);
