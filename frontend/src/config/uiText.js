export const uiTextByLanguage = {
  english: {
    global: {
      language: 'Language',
      appName: 'Keystroke Dynamics Research'
    },
    consent: {
      title: 'Consent Form',
      subtitle: 'Keystroke Dynamics Research Platform',
      welcomeTitle: 'Welcome to Our Research Study',
      welcomeDescription:
        'You are invited to participate in research on keystroke dynamics for Indian scripts.',
      whatYouWillDoTitle: "What You'll Do:",
      whatYouWillDoItems: [
        'Complete a brief survey (2 minutes)',
        'Type sentences in Hindi (10-15 minutes)',
        'Optionally complete an English test (5-10 minutes)'
      ],
      privacyTitle: 'Your Privacy:',
      privacyItems: [
        'Data is anonymized with a random ID',
        'No personal information collected',
        'You can request deletion anytime'
      ],
      consentText:
        'I agree to participate in this research and understand that my keystroke data will be collected.',
      continueButton: 'Continue to Survey ->'
    },
    instructions: {
      title: 'Instructions',
      subtitle: 'Read these before you start',
      body: [
        'You must strictly use the InScript keyboard layout for typing. Do NOT use phonetic, transliteration, or any other keyboard layout.',
        'Before typing, carefully read the displayed sentence.',
        'Memorize the sentence as much as possible before you begin typing.',
        'Once you are ready, type the sentence naturally without looking back at it frequently.',
        'Type at your normal speed and do not intentionally slow down or speed up.',
        'If you make a mistake, correct it using the backspace key as you normally would.',
        'Do not copy-paste the sentence.',
        'Do not use any predictive text, autocorrect, or external typing assistance.'
      ],
      continueButton: 'Continue to Survey ->',
      acknowledgementLabel: 'I understand and will follow these instructions.'
    },
    survey: {
      title: 'Participant Survey',
      subtitle: 'Tell us about your typing background',
      typingProficiency: 'Typing Proficiency *',
      primaryDevice: 'Primary Device *',
      occupation: 'Occupation (Optional)',
      occupationPlaceholder: 'e.g. Student, Engineer, Teacher',
      age: 'Age (Optional)',
      gender: 'Gender (Optional)',
      typingCourseLabel: 'Have you taken a typing course? If yes, specify language(s).',
      typingCourseLanguagePlaceholder: 'e.g. English, Hindi',
      typingHoursPerDayLabel: 'Hours typing/day',
      hoursPerDaySuffix: 'hours/day',
      yesOption: 'Yes',
      noOption: 'No',
      selectPlaceholder: 'Select...',
      preferNotToSay: 'Prefer not to say',
      keyboardOptions: {
        mechanical: 'Mechanical',
        membrane: 'Membrane',
        laptop: 'Laptop Built-in',
        mobile: 'Mobile Touchscreen',
        tablet: 'Tablet'
      },
      proficiencyOptions: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        Professional: 'Professional'
      },
      deviceOptions: {
        computer: 'Laptop / Desktop',
        desktop: 'Desktop',
        laptop: 'Laptop',
        tablet: 'Tablet',
        mobile: 'Mobile'
      },
      genderOptions: {
        male: 'Male',
        female: 'Female',
        other: 'Other'
      },
      startTypingTest: 'Start Typing Test ->'
    },
    typing: {
      progress: 'Progress',
      typeThisSentence: 'Type this sentence:',
      accuracyInstruction:
        'Read the sentence first, memorize it, then type it as accurately as possible.',
      loadingSentence: 'Loading sentence...',
      startTyping: 'Start Typing',
      startTypingPlaceholder: 'Start typing...',
      keystrokes: 'Keystrokes',
      corrections: 'Corrections',
      objectiveErrors: 'Objective Errors',
      nextSentence: 'Enter for Next ->',
      complete: 'Enter to Complete ->',
      enableVirtualKeyboardAdmin: 'Enable Virtual Keyboard (Admin)',
      virtualKeyboard: 'Virtual Keyboard'
    },
    summary: {
      testCompleteSuffix: 'Test Complete',
      performanceSummary: 'Performance summary',
      wpm: 'WPM (Words Per Minute)',
      rawWpm: 'Raw WPM (Raw Words Per Minute)',
      accuracy: 'Accuracy',
      errorRate: 'Error Rate',
      uncorrectedError: 'Uncorrected Error',
      corrections: 'Corrections',
      kspc: 'KSPC',
      ikiMs: 'IKI (Inter-Key Interval, ms)',
      keyDurationMs: 'Key Duration (ms)',
      substitution: 'Substitution',
      omission: 'Omission',
      insertion: 'Insertion',
      cpm: 'CPM (Characters Per Minute)',
      rawCpm: 'Raw CPM (Raw Characters Per Minute)',
      consistency: 'Consistency',
      duration: 'Duration',
      sentences: 'Sentences',
      keystrokes: 'Keystrokes',
      backspaces: 'Backspaces',
      correctChars: 'Correct chars',
      incorrectChars: 'Incorrect chars',
      missedChars: 'Missed chars',
      continueOptionalPrefix: 'Continue to the optional',
      continueOptionalSuffix: 'typing test?',
      skipAndFinish: 'Skip and Finish',
      continue: 'Continue',
      finish: 'Finish',
      downloadResults: 'Download Results'
    },
    completion: {
      allDone: 'All Done!',
      thankYou:
        'Thank you for participating. Your contribution helps advance research.',
      participantId: 'Participant ID',
      sessions: 'Sessions',
      startNewSession: 'Start New Session',
      copyParticipantId: 'Copy Participant ID',
      downloadResults: 'Download Results'
    }
  },
  hindi: {
    global: {
      language: 'भाषा',
      appName: 'स्क्रिप्टलैब रिसर्च',
    },
    consent: {
      title: 'सहमति पत्र',
      subtitle: 'कीस्ट्रोक डायनामिक्स अनुसंधान मंच',
      welcomeTitle: 'अनुसंधान अध्ययन में आपका स्वागत है',
      welcomeDescription:
        'आपको भारतीय लिपियों के लिए कीस्ट्रोक डायनामिक्स अनुसंधान में भाग लेने के लिए आमंत्रित किया जाता है।',
      whatYouWillDoTitle: 'आप क्या करेंगे:',
      whatYouWillDoItems: [
        'एक संक्षिप्त सर्वेक्षण पूरा करें (2 मिनट)',
        'हिंदी में वाक्य टाइप करें (10-15 मिनट)',
        'वैकल्पिक रूप से अंग्रेजी टाइपिंग परीक्षण पूरा करें (5-10 मिनट)'
      ],
      privacyTitle: 'आपकी गोपनीयता:',
      privacyItems: [
        'डेटा को एक यादृच्छिक आईडी के साथ गुमनाम किया जाएगा',
        'कोई व्यक्तिगत जानकारी एकत्र नहीं की जाएगी',
        'आप कभी भी डेटा हटाने का अनुरोध कर सकते हैं'
      ],
      consentText:
        'मैं इस अनुसंधान में भाग लेने के लिए सहमत हूं और समझता/समझती हूं कि मेरा कीस्ट्रोक डेटा एकत्र किया जाएगा।',
      continueButton: 'सर्वेक्षण पर जाएं ->'
    },
    instructions: {
      title: 'निर्देश',
      subtitle: 'शुरू करने से पहले इन्हें ध्यान से पढ़ें',
      body: [
        'टाइपिंग के लिए केवल InScript कीबोर्ड लेआउट का ही उपयोग करें। कृपया फ़ोनेटिक, ट्रांसलिटरेशन या किसी अन्य कीबोर्ड लेआउट का उपयोग न करें।',
        'टाइप करना शुरू करने से पहले प्रदर्शित वाक्य को ध्यानपूर्वक पढ़ें।',
        'टाइप करने से पहले वाक्य को यथासंभव याद कर लें।',
        'तैयार होने के बाद वाक्य को स्वाभाविक रूप से टाइप करें और बार-बार स्क्रीन की ओर न देखें।',
        'अपनी सामान्य गति से टाइप करें, जानबूझकर धीमा या तेज टाइप न करें।',
        'यदि कोई त्रुटि हो जाए तो सामान्य रूप से बैकस्पेस कुंजी का उपयोग करके उसे सुधारें।',
        'वाक्य को कॉपी-पेस्ट न करें।',
        'ऑटो-करेक्ट, प्रेडिक्टिव टेक्स्ट या किसी भी बाहरी टाइपिंग सहायता का उपयोग न करें।'
      ],
      continueButton: 'सर्वेक्षण पर जाएं ->'
    },
    survey: {
      title: 'प्रतिभागी सर्वेक्षण',
      subtitle: 'अपनी टाइपिंग पृष्ठभूमि के बारे में बताएं',
      typingProficiency: 'टाइपिंग दक्षता *',
      primaryDevice: 'प्राथमिक डिवाइस *',
      occupation: 'पेशा (वैकल्पिक)',
      occupationPlaceholder: 'जैसे: छात्र, इंजीनियर, शिक्षक',
      age: 'आयु (वैकल्पिक)',
      gender: 'लिंग (वैकल्पिक)',
      selectPlaceholder: 'चुनें...',
      preferNotToSay: 'बताना नहीं चाहते/चाहती',
      keyboardOptions: {
        mechanical: 'मैकेनिकल',
        membrane: 'मेम्ब्रेन',
        laptop: 'लैपटॉप निर्मित',
        mobile: 'मोबाइल टचस्क्रीन',
        tablet: 'टैबलेट'
      },
      proficiencyOptions: {
        beginner: 'प्रारंभिक',
        intermediate: 'मध्यम',
        Professional: 'प्रवीण'
      },
      deviceOptions: {
        desktop: 'डेस्कटॉप',
        laptop: 'लैपटॉप',
        tablet: 'टैबलेट',
        mobile: 'मोबाइल'
      },
      genderOptions: {
        male: 'पुरुष',
        female: 'महिला',
        other: 'अन्य'
      },
      startTypingTest: 'टाइपिंग परीक्षण शुरू करें ->'
    },
    typing: {
      progress: 'प्रगति',
      typeThisSentence: 'इस वाक्य को टाइप करें:',
      accuracyInstruction: '\u0935\u093e\u0915\u094d\u092f \u0915\u094b \u0927\u094d\u092f\u093e\u0928 \u0938\u0947 \u092a\u0939\u0932\u0947 \u092a\u0922\u093c\u0947\u0902, \u0909\u0938\u0947 \u092f\u093e\u0926 \u0915\u0930\u0947\u0902, \u092b\u093f\u0930 \u0909\u0938\u0947 \u091c\u093f\u0924\u0928\u093e \u0939\u094b \u0938\u0915\u0947 \u0909\u0924\u0928\u093e \u0938\u091f\u0940\u0915 \u091f\u093e\u0907\u092a \u0915\u0930\u0947\u0902.',
      loadingSentence: 'वाक्य लोड हो रहा है...',
      startTyping: 'टाइपिंग शुरू करें',
      startTypingPlaceholder: 'टाइप करना शुरू करें...',
      keystrokes: 'कीस्ट्रोक्स',
      corrections: 'संशोधन',
      objectiveErrors: 'वस्तुनिष्ठ त्रुटियां',
      nextSentence: 'अगला वाक्य ->',
      complete: 'पूर्ण करें ->',
      enableVirtualKeyboardAdmin: 'वर्चुअल कीबोर्ड सक्रिय करें (एडमिन)',
      virtualKeyboard: 'वर्चुअल कीबोर्ड'
    },
    summary: {
      testCompleteSuffix: 'परीक्षण पूरा',
      performanceSummary: 'प्रदर्शन सारांश',
      wpm: 'WPM (Words Per Minute)',
      rawWpm: 'Raw WPM (Raw Words Per Minute)',
      accuracy: 'सटीकता',
      errorRate: 'त्रुटि दर',
      uncorrectedError: 'असंशोधित त्रुटि',
      corrections: 'संशोधन',
      kspc: 'KSPC',
      ikiMs: 'IKI (Inter-Key Interval, ms)',
      keyDurationMs: 'कुंजी अवधि (ms)',
      substitution: 'प्रतिस्थापन',
      omission: 'छूट',
      insertion: 'अतिरिक्त',
      cpm: 'CPM (Characters Per Minute)',
      rawCpm: 'Raw CPM (Raw Characters Per Minute)',
      consistency: 'संगति',
      duration: 'अवधि',
      sentences: 'वाक्य',
      keystrokes: 'कीस्ट्रोक्स',
      backspaces: 'बैकस्पेस',
      correctChars: 'सही अक्षर',
      incorrectChars: 'गलत अक्षर',
      missedChars: 'छूटे अक्षर',
      continueOptionalPrefix: 'क्या आप वैकल्पिक',
      continueOptionalSuffix: 'टाइपिंग परीक्षण जारी रखना चाहेंगे?',
      skipAndFinish: 'छोड़ें और समाप्त करें',
      continue: 'जारी रखें',
      finish: 'समाप्त करें',
      downloadResults: 'परिणाम डाउनलोड करें'
    },
    completion: {
      allDone: 'सभी पूरा!',
      thankYou:
        'भाग लेने के लिए धन्यवाद। आपका योगदान अनुसंधान को आगे बढ़ाने में मदद करता है।',
      participantId: 'प्रतिभागी आईडी',
      sessions: 'सत्र',
      startNewSession: 'नया सत्र शुरू करें',
      copyParticipantId: 'प्रतिभागी आईडी कॉपी करें',
      downloadResults: 'परिणाम डाउनलोड करें'
    }
  },
  marathi: {
    global: {
      language: 'भाषा',
      appName: 'स्क्रिप्टलॅब रिसर्च'
    },
    consent: {
      title: 'संमतीपत्र',
      subtitle: 'कीस्ट्रोक डायनॅमिक्स संशोधन मंच',
      welcomeTitle: 'आमच्या संशोधन अभ्यासात आपले स्वागत आहे',
      welcomeDescription:
        'भारतीय लिप्यांसाठी कीस्ट्रोक डायनॅमिक्स संशोधनात सहभागी होण्यासाठी आपले आमंत्रण आहे.',
      whatYouWillDoTitle: 'आपण काय कराल:',
      whatYouWillDoItems: [
        'संक्षिप्त सर्वे पूर्ण करा (2 मिनिटे)',
        'हिंदी वाक्ये टाइप करा (10-15 मिनिटे)',
        'पर्यायी इंग्रजी टायपिंग चाचणी पूर्ण करा (5-10 मिनिटे)'
      ],
      privacyTitle: 'आपली गोपनीयता:',
      privacyItems: [
        'डेटा यादृच्छिक आयडीसह अनामिक केला जाईल',
        'कोणतीही वैयक्तिक माहिती गोळा केली जाणार नाही',
        'आपण कधीही डेटा हटवण्याची विनंती करू शकता'
      ],
      consentText:
        'मी या संशोधनात सहभागी होण्यास सहमत आहे आणि माझा कीस्ट्रोक डेटा संकलित केला जाईल हे मला समजले आहे.',
      continueButton: 'सर्वेकडे पुढे जा ->'
    },
    instructions: {
      title: 'सूचना',
      subtitle: 'सुरू करण्यापूर्वी कृपया हे नीट वाचा',
      body: [
        'टायपिंगसाठी केवळ InScript कीबोर्ड लेआउटचाच वापर करा. कृपया फोनेटिक, ट्रान्सलिटरेशन किंवा इतर कोणताही कीबोर्ड लेआउट वापरू नका.',
        'टायपिंग सुरू करण्यापूर्वी दाखवलेले वाक्य काळजीपूर्वक वाचा.',
        'टायपिंग करण्यापूर्वी वाक्य शक्य तितके पाठ करा.',
        'तयार झाल्यानंतर वाक्य नैसर्गिक पद्धतीने टाइप करा आणि वारंवार स्क्रीनकडे पाहू नका.',
        'आपल्या नेहमीच्या गतीने टाइप करा, मुद्दाम हळू किंवा जलद टाइप करू नका.',
        'चूक झाल्यास नेहमीप्रमाणे बॅकस्पेस की वापरून ती दुरुस्त करा.',
        'वाक्य कॉपी-पेस्ट करू नका.',
        'ऑटो-करेक्ट, प्रेडिक्टिव टेक्स्ट किंवा कोणतीही बाह्य टायपिंग मदत वापरू नका.'
      ],
      continueButton: 'सर्वेक्षणाकडे पुढे जा ->'
    },
    survey: {
      title: 'सहभागी सर्वेक्षण',
      subtitle: 'आपल्या टायपिंग पार्श्वभूमीबद्दल सांगा',
      typingProficiency: 'टायपिंग प्रवीणता *',
      primaryDevice: 'मुख्य उपकरण *',
      occupation: 'व्यवसाय (पर्यायी)',
      occupationPlaceholder: 'उदा. विद्यार्थी, अभियंता, शिक्षक',
      age: 'वय (पर्यायी)',
      gender: 'लिंग (पर्यायी)',
      selectPlaceholder: 'निवडा...',
      preferNotToSay: 'सांगू इच्छित नाही',
      keyboardOptions: {
        mechanical: 'मेकॅनिकल',
        membrane: 'मेम्ब्रेन',
        laptop: 'लॅपटॉप बिल्ट-इन',
        mobile: 'मोबाइल टचस्क्रीन',
        tablet: 'टॅबलेट'
      },
      proficiencyOptions: {
        beginner: 'नवशिक्या',
        intermediate: 'मध्यम',
        Professional: 'प्रवाहिक'
      },
      deviceOptions: {
        desktop: 'डेस्कटॉप',
        laptop: 'लॅपटॉप',
        tablet: 'टॅबलेट',
        mobile: 'मोबाइल'
      },
      genderOptions: {
        male: 'पुरुष',
        female: 'स्त्री',
        other: 'इतर'
      },
      startTypingTest: 'टायपिंग चाचणी सुरू करा ->'
    },
    typing: {
      progress: 'प्रगती',
      typeThisSentence: 'हे वाक्य टाइप करा:',
      accuracyInstruction: '\u0935\u093e\u0915\u094d\u092f \u0906\u0927\u0940 \u0928\u0940\u091f \u0935\u093e\u091a\u093e, \u0924\u0947 \u0932\u0915\u094d\u0937\u093e\u0924 \u0920\u0947\u0935\u093e, \u0928\u0902\u0924\u0930 \u0924\u0947 \u0936\u0915\u094d\u092f \u0924\u093f\u0924\u0915\u094d\u092f\u093e \u0905\u091a\u0942\u0915\u092a\u0923\u0947 \u091f\u093e\u0907\u092a \u0915\u0930\u093e.',
      loadingSentence: 'वाक्य लोड होत आहे...',
      startTyping: 'टायपिंग सुरू करा',
      startTypingPlaceholder: 'टायपिंग सुरू करा...',
      keystrokes: 'कीस्ट्रोक्स',
      corrections: 'दुरुस्त्या',
      objectiveErrors: 'वस्तुनिष्ठ चुका',
      nextSentence: 'पुढील वाक्य ->',
      complete: 'पूर्ण करा ->',
      enableVirtualKeyboardAdmin: 'व्हर्च्युअल कीबोर्ड सक्षम करा (अॅडमिन)',
      virtualKeyboard: 'व्हर्च्युअल कीबोर्ड'
    },
    summary: {
      testCompleteSuffix: 'चाचणी पूर्ण',
      performanceSummary: 'कामगिरीचा सारांश',
      wpm: 'WPM (Words Per Minute)',
      rawWpm: 'Raw WPM (Raw Words Per Minute)',
      accuracy: 'अचूकता',
      errorRate: 'चूक दर',
      uncorrectedError: 'न दुरुस्त केलेली चूक',
      corrections: 'दुरुस्त्या',
      kspc: 'KSPC',
      ikiMs: 'IKI (Inter-Key Interval, ms)',
      keyDurationMs: 'की दाब कालावधी (ms)',
      substitution: 'बदल',
      omission: 'गळती',
      insertion: 'अधिक घातलेले',
      cpm: 'CPM (Characters Per Minute)',
      rawCpm: 'Raw CPM (Raw Characters Per Minute)',
      consistency: 'सुसंगतता',
      duration: 'कालावधी',
      sentences: 'वाक्ये',
      keystrokes: 'कीस्ट्रोक्स',
      backspaces: 'बॅकस्पेस',
      correctChars: 'योग्य अक्षरे',
      incorrectChars: 'अयोग्य अक्षरे',
      missedChars: 'चुकलेली अक्षरे',
      continueOptionalPrefix: 'आपण पर्यायी',
      continueOptionalSuffix: 'टायपिंग चाचणी सुरू ठेवू इच्छिता?',
      skipAndFinish: 'वगळा आणि पूर्ण करा',
      continue: 'पुढे चालू ठेवा',
      finish: 'पूर्ण करा',
      downloadResults: 'निकाल डाउनलोड करा'
    },
    completion: {
      allDone: 'सर्व पूर्ण!',
      thankYou:
        'सहभागासाठी धन्यवाद. तुमचे योगदान संशोधन पुढे नेण्यास मदत करते.',
      participantId: 'सहभागी आयडी',
      sessions: 'सत्रे',
      startNewSession: 'नवे सत्र सुरू करा',
      copyParticipantId: 'सहभागी आयडी कॉपी करा',
      downloadResults: 'निकाल डाउनलोड करा'
    }
  }
};

export const uiLanguageOptions = [
  { key: 'english', label: 'English' },
  { key: 'hindi', label: 'हिंदी' },
  { key: 'marathi', label: 'मराठी' }
];

export const getUiText = (languageKey) =>
  uiTextByLanguage[languageKey] || uiTextByLanguage.english;
