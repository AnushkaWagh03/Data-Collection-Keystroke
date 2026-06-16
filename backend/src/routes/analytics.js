const express = require('express');
const router = express.Router();

const Participant = require('../models/Participant');
const SentenceAttempts = require('../models/SentenceAttempt');
const Keystroke = require('../models/Keystroke');

/**
 * Basic analytics statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments();
    const totalAttempts = await SentenceAttempts.countDocuments();
    const totalKeystrokes = await Keystroke.countDocuments();

    const AttemptsByLanguage = await SentenceAttempts.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ]);


    res.json({
      success: true,
      stats: {
        total_participants: totalParticipants,
        total_Attempts: totalAttempts,
        total_keystrokes: totalKeystrokes,
        Attempts_by_language: AttemptsByLanguage,
        Attempts_by_visibility_mode: AttemptsByVisibilityMode,
      },
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

module.exports = router;