import { describe, expect, test } from 'vitest';
import {
  getDefaultLayoutIdForLanguage,
  getLayoutForSelection
} from './layouts';

describe('keyboard layout mapping', () => {
  test('returns default layout for known language', () => {
    expect(getDefaultLayoutIdForLanguage('english')).toBe('qwerty');
    expect(getDefaultLayoutIdForLanguage('hindi')).toBe('inscript');
  });

  test('maps keyboard type to layout', () => {
    const inscript = getLayoutForSelection('hindi', 'InScript');
    const phonetic = getLayoutForSelection('hindi', 'Google Hindi Input');

    expect(inscript.id).toBe('inscript');
    expect(phonetic.id).toBe('google_hindi_input');
  });

  test('supports explicit layout override', () => {
    const explicit = getLayoutForSelection('hindi', 'InScript', 'google_hindi_input');
    expect(explicit.id).toBe('google_hindi_input');
  });
});
