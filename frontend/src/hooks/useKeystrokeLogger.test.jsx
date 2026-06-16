import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useKeystrokeLogger } from './useKeystrokeLogger';

describe('useKeystrokeLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('does not log virtual keys when session is inactive', () => {
    const { result } = renderHook(() =>
      useKeystrokeLogger({
        attemptId: 'S_1',
        participantId: 'P_1',
        studySessionId: 'RUN_1',
        sentenceId: 1,
        language: 'english',
        visibilityMode: 'visible',
      })
    );

    act(() => {
      result.current.logVirtualKey('a');
    });

    expect(result.current.keystrokes).toHaveLength(0);
  });

  test('logs virtual key events and includes them in endSession payload', async () => {
    let current = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      current += 10;
      return current;
    });

    const { result } = renderHook(() =>
      useKeystrokeLogger({
        attemptId: 'S_2',
        participantId: 'P_2',
        studySessionId: 'RUN_2',
        sentenceId: 2,
        language: 'hindi',
        visibilityMode: 'visible',
      })
    );

    act(() => {
      result.current.startSession();
    });

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    act(() => {
      result.current.logVirtualKey('a');
      result.current.logVirtualKey('{bksp}');
    });

    await waitFor(() => {
      expect(result.current.attemptData.keystroke_count).toBe(2);
    });

    expect(result.current.keystrokes[0].event_type).toBe('virtual');
    expect(result.current.keystrokes[0].is_virtual).toBe(true);
    expect(result.current.keystrokes[1].is_backspace).toBe(true);
    expect(result.current.attemptData.backspace_count).toBe(1);

    let payload;
    act(() => {
      payload = result.current.endSession();
    });

    expect(payload.keystrokes).toHaveLength(2);
    expect(payload.language).toBe('hindi');
    expect(payload.participant_id).toBe('P_2');
    expect(payload.study_session_id).toBe('RUN_2');
  });
});
