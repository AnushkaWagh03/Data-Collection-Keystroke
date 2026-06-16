import { useEffect, useMemo, useState } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { getLayoutForSelection } from '../config/keyboards/layouts';

const CONTROL_KEYS = new Set([
  '{bksp}',
  '{tab}',
  '{lock}',
  '{enter}',
  '{shift}',
  '{space}'
]);

const parseRow = (row = '') => row.trim().split(/\s+/).filter(Boolean);

const isPlainCharacterToken = (token) =>
  typeof token === 'string' && token.length === 1 && token !== ' ';

const VirtualKeyboard = ({
  languageKey,
  keyboardType,
  layoutId,
  onVirtualKeyPress
}) => {
  const [layoutName, setLayoutName] = useState('default');

  const selectedLayout = useMemo(
    () =>
      getLayoutForSelection(
        languageKey,
        keyboardType,
        layoutId
      ),
    [languageKey, keyboardType, layoutId]
  );

  useEffect(() => {
    setLayoutName('default');
  }, [languageKey, keyboardType, layoutId]);

  if (!selectedLayout) {
    return null;
  }

  const buttonAttributes = useMemo(() => {
    const currentRows = selectedLayout.layout[layoutName] || [];
    const altLayoutName = layoutName === 'default' ? 'shift' : 'default';
    const altRows = selectedLayout.layout[altLayoutName] || [];
    const display = selectedLayout.display || {};
    const attrs = [];

    for (let rowIndex = 0; rowIndex < currentRows.length; rowIndex += 1) {
      const currentTokens = parseRow(currentRows[rowIndex]);
      const altTokens = parseRow(altRows[rowIndex] || '');
      const tokenCount = Math.min(currentTokens.length, altTokens.length);

      for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex += 1) {
        const token = currentTokens[tokenIndex];
        const altToken = altTokens[tokenIndex];

        if (!token || !altToken || token === altToken) continue;
        if (CONTROL_KEYS.has(token)) continue;
        if (!isPlainCharacterToken(token) && !isPlainCharacterToken(altToken)) {
          continue;
        }

        const altLabel = display[altToken] || altToken;
        attrs.push({
          attribute: 'data-alt',
          value: altLabel,
          buttons: token
        });
      }
    }

    return attrs;
  }, [selectedLayout, layoutName]);

  const handleKeyPress = (button) => {
    if (button === '{shift}' || button === '{lock}') {
      if (onVirtualKeyPress) {
        onVirtualKeyPress(button);
      }
      setLayoutName(prev => (prev === 'default' ? 'shift' : 'default'));
      return;
    }

    if (onVirtualKeyPress) {
      onVirtualKeyPress(button);
    }
  };

  return (
    <div className={`virtual-keyboard-wrapper ${layoutName === 'shift' ? 'vk-shift-on' : 'vk-shift-off'}`}>
      <div className="virtual-keyboard-title">
        {selectedLayout.name}
      </div>
      <Keyboard
        layoutName={layoutName}
        layout={selectedLayout.layout}
        display={selectedLayout.display}
        buttonAttributes={buttonAttributes}
        physicalKeyboardHighlight
        syncInstanceInputs={false}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
};

export default VirtualKeyboard;
