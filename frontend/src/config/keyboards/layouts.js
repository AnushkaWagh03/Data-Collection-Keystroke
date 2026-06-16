const LAYOUTS = {
  qwerty: {
    id: 'qwerty',
    name: 'English QWERTY',
    layout: {
      default: [
        '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
        '{tab} q w e r t y u i o p [ ] \\',
        '{lock} a s d f g h j k l ; \' {enter}',
        '{shift} z x c v b n m , . / {shift}',
        '{space}'
      ],
      shift: [
        '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
        '{tab} Q W E R T Y U I O P {lbrace} {rbrace} {pipe}',
        '{lock} A S D F G H J K L : " {enter}',
        '{shift} Z X C V B N M < > ? {shift}',
        '{space}'
      ]
    }
  },
  inscript: {
    id: 'inscript',
    name: 'Hindi InScript',
    layout: {
      default: [
        'ॉ १ २ ३ ४ ५ ६ ७ ८ ९ ० - ृ {bksp}',
        '{tab} ौ ै ा ी ू ब ह ग द ज ड ़',
        '{lock} ो े ् ि ु प र क त च ट {enter}',
        '{shift} ं म न व ल स , . य ़ {shift}',
        '{space}'
      ],
      shift: [
        'औ ऐ आ ई ऊ भ ङ घ ध झ ढ ञ ऋ {bksp}',
        '{tab} औ ऐ आ ई ऊ भ ङ घ ध झ ढ ञ',
        '{lock} ओ ए अ इ उ फ ऱ ख थ छ ठ {enter}',
        '{shift} ँ ण श ष ळ स् ? । य क्ष {shift}',
        '{space}'
      ]
    }
  },
  google_hindi_input: {
    id: 'google_hindi_input',
    name: 'Hindi Phonetic (Google Input)',
    layout: {
      default: [
        '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
        '{tab} q w e r t y u i o p [ ] \\',
        '{lock} a s d f g h j k l ; \' {enter}',
        '{shift} z x c v b n m , . / {shift}',
        '{space}'
      ],
      shift: [
        '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
        '{tab} Q W E R T Y U I O P {lbrace} {rbrace} {pipe}',
        '{lock} A S D F G H J K L : " {enter}',
        '{shift} Z X C V B N M < > ? {shift}',
        '{space}'
      ]
    }
  }
};

const DISPLAY = {
  '{bksp}': 'Backspace',
  '{tab}': 'Tab',
  '{lock}': 'Caps',
  '{enter}': 'Enter',
  '{shift}': 'Shift',
  '{space}': 'Space',
  '{lbrace}': '{',
  '{rbrace}': '}',
  '{pipe}': '|'
};

const LANGUAGE_LAYOUTS = {
  english: ['qwerty'],
  hindi: ['inscript', 'google_hindi_input']
};

const KEYBOARD_TYPE_TO_LAYOUT = {
  QWERTY: 'qwerty',
  DVORAK: 'qwerty',
  COLEMAK: 'qwerty',
  InScript: 'inscript',
  Phonetic: 'google_hindi_input',
  'Google Hindi Input': 'google_hindi_input'
};

export const getLayoutIdForKeyboardType = (keyboardType) =>
  KEYBOARD_TYPE_TO_LAYOUT[keyboardType] || null;

export const getDefaultLayoutIdForLanguage = (languageKey) =>
  (LANGUAGE_LAYOUTS[languageKey] || [])[0] || null;

export const getLayoutForSelection = (
  languageKey,
  keyboardType,
  explicitLayoutId = null
) => {
  const typeLayout = getLayoutIdForKeyboardType(keyboardType);
  const fallbackLayout = getDefaultLayoutIdForLanguage(languageKey);
  const layoutId = explicitLayoutId || typeLayout || fallbackLayout;
  const layoutObj = layoutId ? LAYOUTS[layoutId] : null;

  if (!layoutObj) return null;

  return {
    ...layoutObj,
    display: DISPLAY
  };
};
