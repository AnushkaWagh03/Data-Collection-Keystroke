import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import TypingTest from './TypingTest';
import { getUiText } from '../config/uiText';

vi.mock('./VirtualKeyboard', () => ({
  default: ({ keyboardType }) => (
    <div data-testid="virtual-keyboard">keyboard:{keyboardType}</div>
  ),
}));

const baseConfig = {
  language: 'english',
  font_family: 'sans-serif',
  keyboard_type: ['QWERTY', 'DVORAK'],
  interface_text: {
    start_typing: 'Start Typing',
  },
};

const baseProps = {
  config: baseConfig,
  currentSentence: 'abcd',
  currentSentenceIndex: 0,
  totalSentences: 3,
  isTyping: false,
  typedText: '',
  attemptData: {
    keystroke_count: 0,
    backspace_count: 0,
    error_burst_count: 0,
  },
  isSentenceLoading: false,
  onStartTyping: vi.fn(),
  onTypingChange: vi.fn(),
  onVirtualKeyPress: vi.fn(),
  virtualKeyboardEnabled: false,
  uiText: getUiText('english'),
  onSubmit: vi.fn(),
};

const renderTypingTest = (overrides = {}) =>
  render(<TypingTest {...baseProps} {...overrides} />);

describe('TypingTest', () => {
  test('disables start button while sentence is loading', () => {
    renderTypingTest({
      isSentenceLoading: true,
      currentSentence: '',
    });

    expect(screen.getByText('Loading sentence...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Typing' })).toBeDisabled();
  });

  test('shows objective error count from typed text mismatch', () => {
    renderTypingTest({
      isTyping: true,
      currentSentence: 'abcd',
      typedText: 'abXdY',
      attemptData: {
        keystroke_count: 12,
        backspace_count: 2,
        error_burst_count: 1,
      },
    });

    const errorLabel = screen.getByText('Objective Errors');
    expect(errorLabel).toBeInTheDocument();
    expect(errorLabel.previousElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Corrections')).toBeInTheDocument();
  });

  test('does not render virtual keyboard when disabled', async () => {
    renderTypingTest({
      isTyping: true,
      virtualKeyboardEnabled: false,
    });

    expect(screen.queryByTestId('virtual-keyboard')).not.toBeInTheDocument();
  });

  test('renders virtual keyboard and switches keyboard type', async () => {
    const user = userEvent.setup();

    renderTypingTest({
      isTyping: true,
      virtualKeyboardEnabled: true,
    });

    expect(screen.getByTestId('virtual-keyboard')).toHaveTextContent('keyboard:QWERTY');

    await user.selectOptions(screen.getByRole('combobox'), 'DVORAK');
    expect(screen.getByTestId('virtual-keyboard')).toHaveTextContent('keyboard:DVORAK');
  });

  test('submits sentence on Enter key', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderTypingTest({
      isTyping: true,
      onSubmit,
    });

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
