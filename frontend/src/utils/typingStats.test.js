import { describe, expect, test } from 'vitest';
import {
  aggregateLanguageStats,
  calculateSentenceStats
} from './typingStats';

describe('typingStats utilities', () => {
  test('calculates sentence stats for mixed accuracy', () => {
    const result = calculateSentenceStats({
      targetSentence: 'abcd',
      typedText: 'abXd',
      sessionDurationMs: 60000,
      keystrokes: [{ is_backspace: true }, { is_backspace: false }]
    });

    expect(result.correctChars).toBe(3);
    expect(result.incorrectChars).toBe(1);
    expect(result.missedChars).toBe(1);
    expect(result.backspaces).toBe(1);
    expect(result.wpm).toBe(0.8);
    expect(result.rawWpm).toBe(0.8);
    expect(result.accuracy).toBe(75);
    expect(result.uncorrectedErrorRate).toBe(25);
    expect(result.errorCorrectionsPercent).toBe(50);
    expect(result.kspc).toBe(0.5);
    expect(result.substitutionErrors).toBe(1);
    expect(result.omissionErrors).toBe(0);
    expect(result.insertionErrors).toBe(0);
  });

  test('handles zero/empty inputs defensively', () => {
    const result = calculateSentenceStats({
      targetSentence: '',
      typedText: '',
      sessionDurationMs: 0,
      keystrokes: []
    });

    expect(result.durationMs).toBe(1);
    expect(result.wpm).toBe(0);
    expect(result.rawWpm).toBe(0);
    expect(result.consistency).toBe(100);
    expect(result.uncorrectedErrorRate).toBe(0);
    expect(result.kspc).toBe(0);
  });

  test('aggregates language stats across multiple sentences', () => {
    const aggregate = aggregateLanguageStats([
      {
        durationMs: 30000,
        typedChars: 20,
        targetChars: 20,
        correctChars: 18,
        incorrectChars: 2,
        missedChars: 2,
        backspaces: 1,
        keystrokes: 22,
        consistency: 80
      },
      {
        durationMs: 30000,
        typedChars: 25,
        targetChars: 25,
        correctChars: 20,
        incorrectChars: 5,
        missedChars: 5,
        backspaces: 3,
        keystrokes: 28,
        consistency: 70
      }
    ]);

    expect(aggregate.sentenceCount).toBe(2);
    expect(aggregate.durationSeconds).toBe(60);
    expect(aggregate.correctChars).toBe(38);
    expect(aggregate.backspaces).toBe(4);
    expect(aggregate.keystrokes).toBe(50);
    expect(aggregate.consistency).toBe(75);
    expect(aggregate.errorCorrectionsPercent).toBe(8);
  });
});
