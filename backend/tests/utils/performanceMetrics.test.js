const { calculatePerformanceMetrics } = require('../../src/utils/performanceMetrics');

describe('performance metrics utility', () => {
  test('computes WPM, error rates, and correction measures', () => {
    const metrics = calculatePerformanceMetrics({
      targetSentence: 'road',
      typedText: 'riad',
      sessionDurationMs: 60000,
      keystrokes: [
        { key: 'r', timestamp: 0, dwell_time: 100 },
        { key: 'i', timestamp: 1000, dwell_time: 90 },
        { key: 'a', timestamp: 2000, dwell_time: 80 },
        { key: 'd', timestamp: 3000, dwell_time: 110 },
        { key: 'Backspace', timestamp: 4000, dwell_time: 70, is_backspace: true }
      ]
    });

    expect(metrics.wpm).toBe(12);
    expect(metrics.uncorrected_error_rate).toBe(25);
    expect(metrics.error_corrections_percent).toBe(20);
    expect(metrics.kspc).toBe(1.25);
    expect(metrics.substitution_error_count).toBe(1);
    expect(metrics.omission_error_count).toBe(0);
    expect(metrics.insertion_error_count).toBe(0);
    expect(metrics.iki_sample_count).toBe(4);
    expect(metrics.keypress_duration_sample_count).toBe(5);
  });
});
