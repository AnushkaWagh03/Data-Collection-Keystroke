const Keystroke = require('../../src/models/Keystroke');

describe('Keystroke schema', () => {
  test('accepts keydown/keyup/virtual/input/compositionupdate event types', () => {
    const path = Keystroke.schema.path('event_type');
    expect(path.enumValues).toContain('virtual');
    expect(path.enumValues).toEqual(
      expect.arrayContaining(['keydown', 'keyup', 'virtual', 'input', 'compositionupdate'])
    );
  });
});
