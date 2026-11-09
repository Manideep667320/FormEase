import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessage } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import { extractPersonName } from "@/lib/utils";
import { Mic, MicOff, Volume2, VolumeX, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export const GNANI_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', native: 'English' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
];

const LOCALIZED_WELCOME: Record<string, string> = {
  'en-IN': "Welcome to FormEase! I'll help you complete this form using voice commands. Let's get started.",
  'hi-IN': "FormEase में आपका स्वागत है! मैं वॉयस कमांड से यह फॉर्म भरने में आपकी मदद करूँगा। आइए शुरू करते हैं।",
  'te-IN': "FormEase కు స్వాగతం! వాయిస్ ఆదేశాల ద్వారా ఈ ఫారమ్‌ను పూరించడానికి నేను మీకు సహాయం చేస్తాను. రండి ప్రారంభిద్దాం.",
  'ta-IN': "FormEase-க்கு வரவேற்கிறோம்! குரல் வழிகாட்டலுடன் படிவத்தை நிரப்ப நான் உங்களுக்கு உதவுவேன். தொடங்குவோம்.",
  'kn-IN': "FormEase ಗೆ ಸುಸ್ವಾಗತ! ಧ್ವನಿ ಆಜ್ಞೆಗಳ ಮೂಲಕ ಫಾರ್ಮ್ ತುಂಬಲು ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಬನ್ನಿ ಪ್ರಾರಂಭಿಸೋಣ.",
  'bn-IN': "FormEase-এ স্বাগতম! ভয়েস কমান্ড দিয়ে এই ফর্মটি পূরণ করতে আমি আপনাকে সাহায্য করব। চলুন শুরু করি।",
  'mr-IN': "FormEase मध्ये आपले स्वागत आहे! व्हॉइस कमांड वापरून हा फॉर्म भरण्यासाठी मी आपल्याला मदत करेन. चला सुरू करूया.",
  'gu-IN': "FormEase માં આપનું સ્વાગત છે! વોઇસ કમાન્ડ દ્વારા આ ફોર્મ ભરવામાં હું તમારી મદદ કરીશ. ચાલો શરૂ કરીએ.",
  'ml-IN': "FormEase-ലേക്ക് സ്വാഗതം! വോയ്‌സ് കമാൻഡുകൾ ഉപയോഗിച്ച് ഫോം പൂരിപ്പിക്കാൻ ഞാൻ സഹായിക്കാം. നമുക്ക് തുടങ്ങാം."
};

const LOCALIZED_SWITCH: Record<string, string> = {
  'en-IN': "Language switched to English. Let's continue.",
  'hi-IN': "भाषा बदलकर हिन्दी कर दी गई है। आइए जारी रखें।",
  'te-IN': "భాష తెలుగుకు మార్చబడింది. రండి కొనసాగిద్దాం.",
  'ta-IN': "மொழி தமிழுக்கு மாற்றப்பட்டது. தொடர்வோம்.",
  'kn-IN': "ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಮುಂದುವರಿಯೋಣ.",
  'bn-IN': "भाषा বাংলায় পরিবর্তন করা হয়েছে। চলুন চালিয়ে যাই।",
  'mr-IN': "भाषा मराठीमध्ये बदलली आहे. पुढे सुरू ठेवूया.",
  'gu-IN': "ભાષા ગુજરાતીમાં બદલાઈ ગઈ છે. ચાલો આગળ વધીએ.",
  'ml-IN': "ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി. നമുക്ക് തുടരാം."
};

const FIELD_LABEL_MAP: Record<string, Record<string, string>> = {
  'hi-IN': {
    'state': 'राज्य (State)',
    'district': 'ज़िला (District)',
    'name': 'नाम (Name)',
    'full name': 'पूरा नाम (Full Name)',
    'first name': 'पहला नाम (First Name)',
    'last name': 'अंतिम नाम (Last Name)',
    'surname': 'उपनाम (Surname)',
    'father name': 'पिता का नाम',
    'father\'s name': 'पिता का नाम',
    'mother name': 'माता का नाम',
    'mother\'s name': 'माता का नाम',
    'gender': 'लिंग (Gender)',
    'date of birth': 'जन्म तिथि (Date of Birth)',
    'mobile number': 'मोबाइल नंबर (Mobile Number)',
    'phone number': 'फ़ोन नंबर',
    'email': 'ईमेल पता (Email)',
    'address': 'पता (Address)',
    'pin code': 'पिन कोड (Pin Code)',
    'pincode': 'पिन कोड (Pin Code)',
    'aadhaar number': 'आधार नंबर',
    'epic number': 'मतदाता पहचान पत्र संख्या'
  },
  'te-IN': {
    'state': 'రాష్ట్రం (State)',
    'district': 'జిల్లా (District)',
    'name': 'పేరు (Name)',
    'full name': 'పూర్తి పేరు (Full Name)',
    'first name': 'మొదటి పేరు',
    'last name': 'చివరి పేరు',
    'surname': 'ఇంటిపేరు (Surname)',
    'father name': 'తండ్రి పేరు',
    'father\'s name': 'తండ్రి పేరు',
    'mother name': 'తల్లి పేరు',
    'mother\'s name': 'తల్లి పేరు',
    'gender': 'లింగం (Gender)',
    'date of birth': 'పుట్టిన తేదీ (Date of Birth)',
    'mobile number': 'మొబైల్ నంబర్ (Mobile Number)',
    'email': 'ఈమెయిల్ (Email)',
    'address': 'చిరునామా (Address)',
    'pin code': 'పిన్ కోడ్ (Pin Code)',
    'pincode': 'పిన్ కోడ్ (Pin Code)',
    'aadhaar number': 'ఆధార్ నంబర్'
  },
  'ta-IN': {
    'state': 'மாநிலம் (State)',
    'district': 'மாவட்டம் (District)',
    'name': 'பெயர் (Name)',
    'gender': 'பாலினம் (Gender)',
    'date of birth': 'பிறந்த தேதி',
    'mobile number': 'அலைபேசி எண்',
    'address': 'முகவரி (Address)',
    'pin code': 'அஞ்சல் குறியீடு'
  },
  'kn-IN': {
    'state': 'ರಾಜ್ಯ (State)',
    'district': 'ಜಿಲ್ಲೆ (District)',
    'name': 'ಹೆಸರು (Name)',
    'gender': 'ಲಿಂಗ (Gender)',
    'date of birth': 'ಹುಟ್ಟಿದ ದಿನಾಂಕ',
    'mobile number': 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    'address': 'ವಿಳಾಸ (Address)',
    'pin code': 'ಪಿನ್ ಕೋಡ್'
  }
};

export function getLocalizedWelcome(lang: string): string {
  return LOCALIZED_WELCOME[lang] || LOCALIZED_WELCOME['en-IN'];
}

export function getLocalizedSwitch(lang: string): string {
  return LOCALIZED_SWITCH[lang] || LOCALIZED_SWITCH['en-IN'];
}

export function formatFieldQuestion(label: string, options: string[] | undefined, lang: string): string {
  const norm = label.toLowerCase().trim();
  const trans = FIELD_LABEL_MAP[lang]?.[norm] || label;

  if (lang.startsWith('hi')) {
    return options?.length
      ? `कृपया अपना ${trans} बताएं। विकल्प हैं: ${options.join(', ')}।`
      : `कृपया अपना ${trans} बताएं।`;
  }
  if (lang.startsWith('te')) {
    return options?.length
      ? `దయచేసి మీ ${trans} చెప్పండి. ఎంపికలు: ${options.join(', ')}.`
      : `దయచేసి మీ ${trans} చెప్పండి.`;
  }
  if (lang.startsWith('ta')) {
    return options?.length
      ? `தயவுசெய்து உங்கள் ${trans} கூறவும். தேர்வுகள்: ${options.join(', ')}.`
      : `தயவுசெய்து உங்கள் ${trans} கூறவும்.`;
  }
  if (lang.startsWith('kn')) {
    return options?.length
      ? `ದಯವಿಟ್ಟು ನಿಮ್ಮ ${trans} ತಿಳಿಸಿ. ಆಯ್ಕೆಗಳು: ${options.join(', ')}.`
      : `ದಯವಿಟ್ಟು ನಿಮ್ಮ ${trans} ತಿಳಿಸಿ.`;
  }
  return options?.length
    ? `What is your ${label.toLowerCase()}? Options: ${options.join(', ')}.`
    : `What is your ${label.toLowerCase()}?`;
}

export function getLocalizedAck(lang: string): string {
  if (lang.startsWith('hi')) return "धन्यवाद! ";
  if (lang.startsWith('te')) return "ధన్యవాదాలు! ";
  if (lang.startsWith('ta')) return "நன்றி! ";
  if (lang.startsWith('kn')) return "ಧನ್ಯವಾದಗಳು! ";
  return "Thank you! ";
}

export function getLocalizedComplete(lang: string): string {
  if (lang.startsWith('hi')) return "बहुत बढ़िया! सभी आवश्यक फ़ील्ड पूरे हो चुके हैं। क्या आप अभी फ़ॉर्म सबमिट करना चाहते हैं?";
  if (lang.startsWith('te')) return "అద్భుతం! అన్ని అవసరమైన వివరాలు పూర్తయ్యాయి. మీరు ఫారమ్‌ను సమర్పించాలనుకుంటున్నారా?";
  if (lang.startsWith('ta')) return "அற்புதம்! அனைத்து விவரங்களும் முடிந்துவிட்டன. படிவத்தை சமர்ப்பிக்க விரும்புகிறீர்களா?";
  if (lang.startsWith('kn')) return "ಉತ್ತಮ! ಎಲ್ಲಾ ವಿವರಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ. ನೀವು ಫಾರ್ಮ್ ಅನ್ನು ಸಲ್ಲಿಸಲು ಬಯಸುವಿರಾ?";
  return "Great! All required fields look complete. Would you like to submit the form now?";
}

// Extend ChatMessage to include id
interface ExtendedChatMessage extends ChatMessage {
  id?: string;
}

// Define intent types
interface BaseIntent {
  intent: string;
}

interface FillFieldIntent extends BaseIntent {
  intent: "fillField";
  fieldKey?: string;
  sectionId?: number;
  value?: string;
}

interface EditIntent extends BaseIntent {
  intent: "edit";
  fieldKey?: string;
  sectionId?: number;
  value?: string;
}

interface SubmitIntent extends BaseIntent {
  intent: "submit";
}

interface GoBackIntent extends BaseIntent {
  intent: "goBack";
}

interface UnknownIntent extends BaseIntent {
  intent: "unknown";
}

type Intent = FillFieldIntent | EditIntent | SubmitIntent | GoBackIntent | UnknownIntent;

interface FormField {
  id: string;
  sectionId: string;
  fieldKey: string;
  label: string;
  value?: string;
  required: boolean;
  type: string;
  options?: string[];
}

interface LocalFormSectionWithFields {
  id: number;
  title: string;
  fields: FormField[];
}

interface VoiceAssistantProps {
  formCode: string;
  formSections: LocalFormSectionWithFields[];
  onFieldUpdate: (sectionId: number, fieldKey: string, value: string) => void;
  onFormSubmit: () => void;
  onGoBack?: () => void;
}

const SUBMIT_PATTERNS = [
  /\b(submit|done|finish|complete|send|ready|go ahead|proceed|finalize)\b/i,
  /\b(that'?s all|everything is complete|looks? good|i'?m done|let'?s submit)\b/i,
  /\b(yes|yeah|correct|sure|absolutely|please|ok|okay)\b.*\b(submit|send|finish|complete)\b/i
];

const EDIT_PATTERNS = [
  /(?:change|edit|update|fix|correct|modify)\s+(?:my|the)?\s*(\w+)(?:\s+(?:to|with|as)?\s+(.+))?$/i,
  /(?:make|set)\s+(?:my|the)?\s*(\w+)(?:\s+(?:to|as|be)?\s+(.+))?$/i
];

export default function VoiceAssistant({
  formCode,
  formSections,
  onFieldUpdate,
  onFormSubmit,
  onGoBack
}: VoiceAssistantProps) {
  // State management
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [askedFields, setAskedFields] = useState<string[]>([]);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string>("");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isProcessingInput, setIsProcessingInput] = useState(false);
  const [gnaniCredits, setGnaniCredits] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN");

  const currentPlaybackIdRef = useRef(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = useRef(false);

  // Immediately cancel and stop any in-flight or playing audio/speech
  const stopAllSpeech = useCallback(() => {
    currentPlaybackIdRef.current++;
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceQueue.current = [];
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    fetch('/api/gnani/credits')
      .then(r => r.json())
      .then(d => {
        if (typeof d.remainingCredits === 'number') {
          setGnaniCredits(d.remainingCredits);
        }
      })
      .catch(() => {});
  }, []);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const {
    isTranscribing,
    currentTranscript,
    finalTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport
  } = useSpeechRecognition();
  
  // Track spoken messages to prevent duplicates
  const spokenMessages = useRef<Set<string>>(new Set());
  
  // Track initialization to prevent multiple runs
  const hasInitialized = useRef(false);

  // Track if welcome message has been spoken
  const welcomeMessageSpoken = useRef(false);

  // Track if welcome message has been displayed
  const welcomeMessageDisplayed = useRef(false);
  
  // Memoized form sections data
  const memoizedFormSections = useMemo<LocalFormSectionWithFields[]>(() => {
    console.log('memoizedFormSections:', formSections);
    return formSections;
  }, [formSections]);

  // Get the next empty required field
  const getNextEmptyField = useCallback((lang?: string) => {
    const activeLang = lang || selectedLanguage;
    console.log('getNextEmptyField: askedFields:', askedFields);
    for (const section of memoizedFormSections) {
      for (const field of section.fields) {
        if (field.required && (!field.value || field.value.trim() === "")) {
          const fieldId = `${section.id}-${field.fieldKey}`;
          if (!askedFields.includes(fieldId)) {
            const question = formatFieldQuestion(field.label, field.options, activeLang);
            return { sectionId: section.id, fieldKey: field.fieldKey, label: field.label, options: field.options, question, fieldId };
          }
        }
      }
    }
    
    for (const section of memoizedFormSections) {
      for (const field of section.fields) {
        if (field.required && (!field.value || field.value.trim() === "")) {
          const fieldId = `${section.id}-${field.fieldKey}`;
          const question = formatFieldQuestion(field.label, field.options, activeLang);
          return { sectionId: section.id, fieldKey: field.fieldKey, label: field.label, options: field.options, question, fieldId };
        }
      }
    }
    
    return null;
  }, [memoizedFormSections, askedFields, selectedLanguage]);

  // Mock NLP processor functions
  const processVoiceInput = useCallback(
    async (text: string, formCode: string, sections: LocalFormSectionWithFields[], context: any) => {
      console.log('processVoiceInput:', { text, context });
      const fieldUpdates = [];
      for (const section of sections) {
        for (const field of section.fields) {
          if (
            text.toLowerCase().includes(field.label.toLowerCase()) ||
            text.toLowerCase().includes(field.fieldKey.toLowerCase())
          ) {
            let value = text.replace(new RegExp(`${field.label}|${field.fieldKey}`, 'i'), '').trim();
            if (!value) value = text.trim();
            if (field.options?.length) {
              const matchedOption = field.options.find(opt =>
                opt.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(opt.toLowerCase())
              );
              if (matchedOption) value = matchedOption;
            }
            if (value) {
              fieldUpdates.push({ sectionId: section.id, fieldKey: field.fieldKey, value });
            }
          }
        }
      }
      return {
        fieldUpdates,
        nextQuestion: fieldUpdates.length ? "Got it! What's next?" : "What else would you like to tell me?"
      };
    },
    []
  );

  const determineIntent = useCallback(
    async (text: string, sections: LocalFormSectionWithFields[]): Promise<Intent> => {
      console.log('determineIntent:', { text, context: currentContext.current });
      // Check for submit or go back intents
      if (SUBMIT_PATTERNS.some(pattern => pattern.test(text.toLowerCase()))) {
        return { intent: "submit" };
      }
      if (text.toLowerCase().includes("go back") || text.toLowerCase().includes("previous")) {
        return { intent: "goBack" };
      }
      // Check for edit intent
      for (const pattern of EDIT_PATTERNS) {
        const match = text.match(pattern);
        if (match?.[1]) {
          const fieldKeyword = match[1].toLowerCase();
          const value = match[2]?.trim();
          for (const section of sections) {
            for (const field of section.fields) {
              if (
                field.label.toLowerCase().includes(fieldKeyword) ||
                field.fieldKey.toLowerCase().includes(fieldKeyword)
              ) {
                return {
                  intent: "edit",
                  fieldKey: field.fieldKey,
                  sectionId: section.id,
                  value
                };
              }
            }
          }
        }
      }
      // Default to fillField using context or next empty field
      const value = text.trim();
      const nextField = getNextEmptyField();
      const fieldKey = currentContext.current.currentFieldKey || nextField?.fieldKey;
      const sectionId = currentContext.current.currentSectionId || nextField?.sectionId;
      
      return {
        intent: "fillField",
        fieldKey,
        sectionId,
        value
      };
    },
    [getNextEmptyField]
  );

  const getWelcomeMessage = useCallback(
    async (formCode: string) => {
      // Normalize formCode to lowercase to match backend keys
      const normalizedFormCode = formCode.toLowerCase();
      try {
        // Call backend API to get welcome message
        const response = await fetch(`/api/welcome-message/${normalizedFormCode}`);
        if (!response.ok) {
          const text = await response.text();
          console.error(`Failed to fetch welcome message for formCode: ${normalizedFormCode}, response text:`, text);
          throw new Error(`Failed to fetch welcome message for formCode: ${normalizedFormCode}`);
        }
        const data = await response.json();
        if (data.message) {
          return data.message;
        }
        return "Welcome to FormEase!";
      } catch (error) {
        console.warn("Failed to fetch welcome message, falling back to default.", error);
        return "Welcome to FormEase!";
      }
    },
    []
  );

  const isNlpProcessing = false; // Mock state
  
  // Track current context
  const currentContext = useRef<{
    lastQuestion?: string;
    currentSectionId?: number;
    currentFieldKey?: string;
  }>({});

  // Initialize voices for speech synthesis
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechEnabled(false);
      console.warn("Speech synthesis not supported in this browser");
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        } catch (e) {}
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Speak text using Gnani Indic TTS with automatic browser SpeechSynthesis fallback
  const speakText = useCallback(async (text: string, messageId: string) => {
    console.log(`speakText: "${text}", messageId: "${messageId}"`);
    if (!speechEnabled || !text || text.includes("...") || spokenMessages.current.has(messageId)) {
      console.log(`speakText skipped: speechEnabled=${speechEnabled}, text="${text}", alreadySpoken=${spokenMessages.current.has(messageId)}`);
      return;
    }

    spokenMessages.current.add(messageId);

    // Stop any in-flight or playing audio and get a new playback session ID
    stopAllSpeech();
    const sessionPlaybackId = currentPlaybackIdRef.current;

    const fallbackBrowserSpeech = (textToSpeak: string) => {
      if (sessionPlaybackId !== currentPlaybackIdRef.current) return;
      if (!('speechSynthesis' in window)) return;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = selectedLanguage;

      const langPrefix = selectedLanguage.split('-')[0].toLowerCase();
      const voice = availableVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) ||
                    availableVoices.find(v => v.lang.toLowerCase().startsWith('en'));
      if (voice) utterance.voice = voice;

      utterance.volume = 1;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (sessionPlaybackId === currentPlaybackIdRef.current) {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (sessionPlaybackId === currentPlaybackIdRef.current) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (sessionPlaybackId === currentPlaybackIdRef.current) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        }
      };

      utteranceQueue.current.push(utterance);
      if (!isSpeakingRef.current) {
        window.speechSynthesis.speak(utterance);
      }
    };

    // Attempt Gnani Indic TTS inference
    try {
      const response = await fetch('/api/gnani/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: selectedLanguage
        })
      });

      if (sessionPlaybackId !== currentPlaybackIdRef.current) {
        console.log("Stale Gnani TTS response discarded");
        return;
      }

      if (!response.ok) {
        console.warn('Gnani TTS returned non-200, falling back to browser speech synthesis');
        fallbackBrowserSpeech(text);
        return;
      }

      const data = await response.json();
      if (sessionPlaybackId !== currentPlaybackIdRef.current) {
        console.log("Stale Gnani TTS data discarded");
        return;
      }

      if (typeof data.remainingCredits === 'number') {
        setGnaniCredits(data.remainingCredits);
      }

      if (data.success && data.audioBase64) {
        const audio = new Audio(data.audioBase64);
        currentAudioRef.current = audio;
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        audio.onended = () => {
          if (sessionPlaybackId === currentPlaybackIdRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            currentAudioRef.current = null;
          }
        };

        audio.onerror = (err) => {
          console.warn('Gnani audio playback error, falling back to browser speech:', err);
          if (sessionPlaybackId === currentPlaybackIdRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            currentAudioRef.current = null;
            fallbackBrowserSpeech(text);
          }
        };

        await audio.play();
      } else {
        console.info('Gnani TTS responded with fallbackToBrowser:', data.message);
        fallbackBrowserSpeech(text);
      }
    } catch (err) {
      if (sessionPlaybackId === currentPlaybackIdRef.current) {
        console.warn('Gnani TTS network error, falling back to browser speech:', err);
        fallbackBrowserSpeech(text);
      }
    }
  }, [speechEnabled, selectedLanguage, availableVoices, stopAllSpeech]);

  // Chat message helpers
  const addBotMessage = useCallback((text: string, thinking = false) => {
    setMessages(prev => {
      const filtered = prev.filter(msg => !msg.thinking);
      const messageId = `${text}-${Date.now().toString()}`;
      if (!thinking) {
        speakText(text, messageId);
      }
      return [...filtered, { sender: "bot", text, thinking, id: messageId } as ExtendedChatMessage];
    });
  }, [speakText]);

  const addUserMessage = useCallback((text: string) => {
    stopAllSpeech();
    setMessages(prev => [...prev, { sender: "user", text, id: `${text}-${Date.now().toString()}` } as ExtendedChatMessage]);
  }, [stopAllSpeech]);

  // Initialize the conversation strictly once
  const initializeConversation = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      setMessages([]);
      setAskedFields([]);
      setLastAskedQuestion("");
      currentContext.current = {};

      const personalSection = memoizedFormSections.find(s => s.title.includes("Personal"));
      const allSections = personalSection ? 
        [personalSection, ...memoizedFormSections.filter(s => s.id !== personalSection.id)] : 
        memoizedFormSections;

      const fieldsToAsk = allSections.flatMap(section => 
        section.fields
          .filter(field => field.required && (!field.value || field.value.trim() === ""))
          .map(field => ({ section, field }))
      );

      const welcomePrefix = getLocalizedWelcome(selectedLanguage);
      let initialGreeting = welcomePrefix;

      if (fieldsToAsk.length > 0) {
        const { section, field } = fieldsToAsk[0];
        const fieldId = `${section.id}-${field.fieldKey}`;
        const question = formatFieldQuestion(field.label, field.options, selectedLanguage);

        setAskedFields([fieldId]);
        setLastAskedQuestion(question);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: section.id,
          currentFieldKey: field.fieldKey
        };
        initialGreeting = `${welcomePrefix} ${question}`;
      }

      addBotMessage(initialGreeting);
    } catch (error) {
      console.error("Failed to initialize conversation:", error);
      addBotMessage(getLocalizedWelcome(selectedLanguage));
    }
  }, [memoizedFormSections, selectedLanguage, addBotMessage]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize strictly once on mount
  useEffect(() => {
    initializeConversation();
    return () => {
      stopAllSpeech();
    };
  }, []);

  // Type guards for intents
  const isFillFieldIntent = (intent: Intent): intent is FillFieldIntent => intent.intent === "fillField";
  const isEditIntent = (intent: Intent): intent is EditIntent => intent.intent === "edit";
  const isSubmitIntent = (intent: Intent): intent is SubmitIntent => intent.intent === "submit";
  const isGoBackIntent = (intent: Intent): intent is GoBackIntent => intent.intent === "goBack";

  // Handle user input
  const handleUserInput = async (text: string) => {
    console.log('handleUserInput: input text:', text);
    if (!text || !text.trim()) {
      console.log('handleUserInput: empty input detected');
      addBotMessage("I didn't catch that. Could you please try again?");
      return;
    }

    addUserMessage(text);
    setIsProcessingInput(true);

    try {
      let intent: Intent = await determineIntent(text, memoizedFormSections);
      console.log('handleUserInput: intent:', intent);

      if (isFillFieldIntent(intent)) {
        if (!intent.fieldKey || !intent.sectionId || !intent.value) {
          console.log('Incomplete intent, trying next empty field:', intent);
          const nextField = getNextEmptyField();
          if (nextField && intent.value) {
            intent = {
              intent: "fillField",
              fieldKey: nextField.fieldKey,
              sectionId: nextField.sectionId,
              value: intent.value
            };
            console.log('Updated intent with next field:', intent);
          }
        }
        await handleFillFieldIntent(intent, text);
      } else if (isSubmitIntent(intent)) {
        await handleSubmit();
      } else if (isGoBackIntent(intent)) {
        addBotMessage("Alright, let's go back to the form selection page.");
        onGoBack?.();
      } else if (isEditIntent(intent) && intent.fieldKey && intent.sectionId) {
        await handleEditIntent(intent);
      } else {
        console.log('Falling back to handleFallbackProcessing');
        await handleFallbackProcessing(text);
      }
    } catch (error) {
      console.error("Error processing voice input:", error);
      addBotMessage("I'm sorry, I encountered an error processing your request. Please try again.");
    } finally {
      setIsProcessingInput(false);
    }
  };

  // Handle edit intent
  const handleEditIntent = async (intent: EditIntent) => {
    console.log('handleEditIntent:', intent);
    if (intent.value && intent.fieldKey && intent.sectionId) {
      console.log('Calling onFieldUpdate:', { sectionId: intent.sectionId, fieldKey: intent.fieldKey, value: intent.value });
      onFieldUpdate(intent.sectionId, intent.fieldKey, intent.value);
      
      const nextEmptyField = getNextEmptyField();
      if (nextEmptyField) {
        const question = nextEmptyField.question;
        if (nextEmptyField.fieldId) setAskedFields(prev => [...prev, nextEmptyField.fieldId]);
        addBotMessage(`Updated ${intent.fieldKey}. ${question}`);
        setLastAskedQuestion(question);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: nextEmptyField.sectionId,
          currentFieldKey: nextEmptyField.fieldKey
        };
        console.log('handleEditIntent: context updated:', currentContext.current);
      } else {
        const submitPrompt = "Updated! All fields look complete. Would you like to submit the form now?";
        addBotMessage(submitPrompt);
        setLastAskedQuestion(submitPrompt);
      }
    } else if (intent.fieldKey && intent.sectionId) {
      const editPrompt = `I'll help you edit the ${intent.fieldKey} field. What would you like to change it to?`;
      if (editPrompt !== lastAskedQuestion) {
        addBotMessage(editPrompt);
        setLastAskedQuestion(editPrompt);
        currentContext.current = {
          lastQuestion: editPrompt,
          currentSectionId: intent.sectionId,
          currentFieldKey: intent.fieldKey
        };
        console.log('handleEditIntent: context updated:', currentContext.current);
      }
    } else {
      addBotMessage("I'm sorry, I couldn't process your edit request. Please try again.");
    }
  };

  // Handle fill field intent
  const handleFillFieldIntent = async (
    intent: FillFieldIntent,
    originalText: string
  ) => {
    console.log('handleFillFieldIntent:', { intent, originalText });
    
    let fieldKey = intent.fieldKey;
    let sectionId = intent.sectionId;
    const value = intent.value?.trim();

    // If intent is incomplete, try next empty field
    if (!fieldKey || !sectionId || !value) {
      console.log('Incomplete intent, attempting fallback to next field');
      const nextField = getNextEmptyField();
      if (nextField && value) {
        fieldKey = nextField.fieldKey;
        sectionId = nextField.sectionId;
      } else {
        console.log('No next field or value, falling back to processing');
        await handleFallbackProcessing(originalText);
        return;
      }
    }

    let section = memoizedFormSections.find(s => s.id === sectionId);
    let field = section?.fields.find(f => 
      f.fieldKey.toLowerCase() === fieldKey?.toLowerCase() ||
      f.label.toLowerCase().includes(fieldKey?.toLowerCase() || '')
    );

    // Broaden field lookup
    if (!field) {
      console.log('Field not found in section, searching all sections:', { fieldKey, sectionId });
      for (const s of memoizedFormSections) {
        field = s.fields.find(f =>
          f.fieldKey.toLowerCase().includes(fieldKey?.toLowerCase() || '') ||
          f.label.toLowerCase().includes(fieldKey?.toLowerCase() || '') ||
          fieldKey?.toLowerCase().includes(f.label.toLowerCase())
        );
        if (field) {
          section = s;
          sectionId = s.id;
          break;
        }
      }
    }

    if (!field || !section) {
      console.log('Field or section not found:', { fieldKey, sectionId });
      addBotMessage("Sorry, I couldn't find the field to process. Let's try the next one.");
      const nextField = getNextEmptyField();
      if (nextField) {
        const question = nextField.question;
        if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
        addBotMessage(question);
        setLastAskedQuestion(question);
        currentContext.current = {
          lastQuestion: question,
          currentSectionId: nextField.sectionId,
          currentFieldKey: nextField.fieldKey
        };
        console.log('handleFillFieldIntent: context reset:', currentContext.current);
      } else {
        addBotMessage("All fields seem complete. Would you like to submit?");
      }
      return;
    }

    let valueToUpdate = value;

    // Handle radio fields
    if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
      const userInputNormalized = valueToUpdate.toLowerCase().trim();
      console.log('Radio field matching:', { userInput: userInputNormalized, options: field.options });
      const matchedOption = field.options.find(opt => {
        const optNormalized = opt.toLowerCase().trim();
        return (
          optNormalized.includes(userInputNormalized) ||
          userInputNormalized.includes(optNormalized)
        );
      });
      if (!matchedOption) {
        console.log('No matching option for radio field:', { userInput: userInputNormalized, options: field.options });
        addBotMessage(`Please choose one of: ${field.options.join(", ")}.`);
        setLastAskedQuestion(`What is your ${field.label.toLowerCase()}? Options: ${field.options.join(", ")}.`);
        return;
      }
      valueToUpdate = matchedOption;
    }

    console.log('Calling onFieldUpdate:', { sectionId, fieldKey: field.fieldKey, value: valueToUpdate });
    onFieldUpdate(sectionId, field.fieldKey, valueToUpdate);

    addBotMessage("Processing your response...", true);
    
    const result = await processVoiceInput(
      originalText,
      formCode,
      memoizedFormSections,
      currentContext.current
    );
    
    setMessages(prev => prev.filter(msg => !msg.thinking));

    if ("error" in result) {
      console.log('Error in processVoiceInput, falling back');
      await handleFallbackProcessing(originalText);
      return;
    }

    let updatedAnyField = false;
    if (result.fieldUpdates?.length) {
      updatedAnyField = true;
      for (const update of result.fieldUpdates) {
        console.log('Additional field update:', update);
        onFieldUpdate(update.sectionId, update.fieldKey, update.value);
      }
    }

    if ((result as any).clarification?.question) {
      const clar = (result as any).clarification;
      const prefix = updatedAnyField ? "Extracted details! " : "";
      addBotMessage(`${prefix}${clar.question}`);
      setLastAskedQuestion(clar.question);
      const targetSec = memoizedFormSections.find(s => s.fields.some(f => f.fieldKey === clar.fieldKey));
      currentContext.current = {
        lastQuestion: clar.question,
        currentSectionId: targetSec ? targetSec.id : undefined,
        currentFieldKey: clar.fieldKey
      };
      return;
    }

    const nextEmptyField = getNextEmptyField(selectedLanguage);
    const ack = getLocalizedAck(selectedLanguage);
    
    if (nextEmptyField) {
      const question = nextEmptyField.question;
      if (nextEmptyField.fieldId) setAskedFields(prev => [...prev, nextEmptyField.fieldId]);
      const prefix = updatedAnyField ? ack : "";
      addBotMessage(`${prefix}${question}`);
      setLastAskedQuestion(question);
      currentContext.current = {
        lastQuestion: question,
        currentSectionId: nextEmptyField.sectionId,
        currentFieldKey: nextEmptyField.fieldKey
      };
      console.log('handleFillFieldIntent: context updated:', currentContext.current);
    } else if (updatedAnyField) {
      const submitQuestion = getLocalizedComplete(selectedLanguage);
      addBotMessage(submitQuestion);
      setLastAskedQuestion(submitQuestion);
    } else {
      const nextQuestion = selectedLanguage.startsWith('hi')
        ? "क्या आप अपने आवेदन के बारे में कुछ और बताना चाहते हैं?"
        : selectedLanguage.startsWith('te')
        ? "మీ దరఖాస్తు గురించి ఇంకా ఏదైనా చెప్పాలనుకుంటున్నారా?"
        : "What else would you like to tell me about your application?";
      addBotMessage(nextQuestion);
      setLastAskedQuestion(nextQuestion);
    }
  };

  // Handle form submission
  const handleSubmit = useCallback(() => {
    console.log('handleSubmit');
    window.speechSynthesis.cancel();
    addBotMessage("Great! Let me verify all the information before submitting...", true);

    setTimeout(() => {
      setMessages(prev => prev.filter(msg => !msg.thinking));

      const isFormValid = memoizedFormSections.every(section =>
        section.fields.every(field => !field.required || (field.value && field.value.trim() !== ""))
      );

      if (isFormValid) {
        const submitConfirmation = "Everything looks good! Submitting your form now.";
        
        if (submitConfirmation !== lastAskedQuestion) {
          addBotMessage(submitConfirmation);
          setLastAskedQuestion(submitConfirmation);
          setTimeout(() => onFormSubmit(), 1500);
        } else {
          onFormSubmit();
        }
      } else {
        const missingFields = memoizedFormSections
          .flatMap(section => 
            section.fields
              .filter(field => field.required && (!field.value || field.value.trim() === ""))
              .map(field => field.label)
          );
        
        const incompleteMessage = `There are still some required fields missing: ${missingFields.join(", ")}. Let's complete those first.`;
        
        const nextField = getNextEmptyField();
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`${incompleteMessage}\n\n${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleSubmit: context updated:', currentContext.current);
        } else {
          addBotMessage(incompleteMessage);
        }
      }
    }, 1500);
  }, [memoizedFormSections, lastAskedQuestion, onFormSubmit, addBotMessage, getNextEmptyField]);

  // Fallback processing
  const handleFallbackProcessing = async (text: string) => {
    console.log('handleFallbackProcessing:', { text });
    try {
      const directFieldUpdates = await extractFieldInfoFromText(text, memoizedFormSections);
      
      if (directFieldUpdates?.length) {
        for (const update of directFieldUpdates) {
          console.log('Fallback field update:', update);
          onFieldUpdate(update.sectionId, update.fieldKey, update.value);
        }
      
        const nextField = getNextEmptyField();
        
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`Got it! ${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleFallbackProcessing: context updated:', currentContext.current);
        } else {
          const submitQuestion = "All fields are complete! Would you like to submit the form now?";
          addBotMessage(submitQuestion);
          setLastAskedQuestion(submitQuestion);
        }
      } else {
        console.log('No field updates in fallback, trying context or next field');
        // Try context-based update
        if (currentContext.current.currentFieldKey && currentContext.current.currentSectionId) {
          const field = memoizedFormSections
            .find(s => s.id === currentContext.current.currentSectionId)
            ?.fields.find(f => f.fieldKey === currentContext.current.currentFieldKey);
          if (field) {
            let value = text.trim();
            if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
              const userInputNormalized = value.toLowerCase().trim();
              const matchedOption = field.options.find(opt => {
                const optNormalized = opt.toLowerCase().trim();
                return (
                  optNormalized.includes(userInputNormalized) ||
                  userInputNormalized.includes(optNormalized)
                );
              });
              if (matchedOption) {
                value = matchedOption;
                console.log('Context-based radio update:', { sectionId: currentContext.current.currentSectionId, fieldKey: field.fieldKey, value });
                onFieldUpdate(currentContext.current.currentSectionId, field.fieldKey, value);
              }
            } else {
              console.log('Context-based update:', { sectionId: currentContext.current.currentSectionId, fieldKey: field.fieldKey, value });
              onFieldUpdate(currentContext.current.currentSectionId, field.fieldKey, value);
            }
            const nextField = getNextEmptyField();
            if (nextField) {
              const question = nextField.question;
              if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
              addBotMessage(`Got it! ${question}`);
              setLastAskedQuestion(question);
              currentContext.current = {
                lastQuestion: question,
                currentSectionId: nextField.sectionId,
                currentFieldKey: nextField.fieldKey
              };
              console.log('handleFallbackProcessing: context updated:', currentContext.current);
              return;
            }
          }
        }
        // Fall back to next field
        const nextField = getNextEmptyField();
        if (nextField) {
          const question = nextField.question;
          if (nextField.fieldId) setAskedFields(prev => [...prev, nextField.fieldId]);
          addBotMessage(`I'm sorry, I didn't understand that. Let's try: ${question}`);
          setLastAskedQuestion(question);
          currentContext.current = {
            lastQuestion: question,
            currentSectionId: nextField.sectionId,
            currentFieldKey: nextField.fieldKey
          };
          console.log('handleFallbackProcessing: context reset:', currentContext.current);
        } else {
          addBotMessage("I'm sorry, I couldn't understand that. All fields seem complete. Would you like to submit?");
        }
      }
    } catch (error) {
      console.error("Error in fallback extraction:", error);
      addBotMessage("I'm sorry, I couldn't process that properly. Please try again with a clearer phrase.");
    }
  };

  // Extract field information from text
  const extractFieldInfoFromText = useCallback(async (text: string, sections: LocalFormSectionWithFields[]) => {
    console.log('extractFieldInfoFromText:', { text });
    const updates: { sectionId: number; fieldKey: string; value: string }[] = [];
    
    try {
      const nameInfo = await extractPersonName(text);
      
      if (nameInfo?.success && nameInfo.extractedName) {
        for (const section of sections) {
          for (const field of section.fields) {
            if (
              field.fieldKey.toLowerCase().includes('name') ||
              field.label.toLowerCase().includes('name')
            ) {
              if (!field.value || field.value.trim() === '') {
                updates.push({
                  sectionId: section.id,
                  fieldKey: field.fieldKey,
                  value: nameInfo.extractedName
                });
                console.log('Name update:', { sectionId: section.id, fieldKey: field.fieldKey, value: nameInfo.extractedName });
                break;
              }
            }
          }
          if (updates.length > 0) break;
        }
      }

      // General field matching
      for (const section of sections) {
        for (const field of section.fields) {
          if (
            text.toLowerCase().includes(field.label.toLowerCase()) ||
            text.toLowerCase().includes(field.fieldKey.toLowerCase())
          ) {
            let value = text.replace(new RegExp(`${field.label}|${field.fieldKey}`, 'i'), '').trim();
            if (!value) value = text.trim();
            if (field.type === "radio" && Array.isArray(field.options) && field.options.length > 0) {
              const userInputNormalized = value.toLowerCase().trim();
              console.log('Radio field matching in extract:', { userInput: userInputNormalized, options: field.options });
              const matchedOption = field.options.find(opt => {
                const optNormalized = opt.toLowerCase().trim();
                return (
                  optNormalized.includes(userInputNormalized) ||
                  userInputNormalized.includes(optNormalized)
                );
              });
              if (matchedOption) {
                value = matchedOption;
              } else {
                console.log('No matching option in extract:', { userInput: userInputNormalized, options: field.options });
                continue;
              }
            }
            if (value) {
              updates.push({
                sectionId: section.id,
                fieldKey: field.fieldKey,
                value
              });
              console.log('Field update in extract:', { sectionId: section.id, fieldKey: field.fieldKey, value });
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error extracting name:", error);
    }
    
    console.log('extractFieldInfoFromText updates:', updates);
    return updates;
  }, [memoizedFormSections]);

  // Toggle voice recording
  const handleToggleRecording = useCallback(async () => {
    if (!hasRecognitionSupport) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser does not support speech recognition. Please try using Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    console.log("toggleRecording: isTranscribing:", isTranscribing, "isProcessingInput:", isProcessingInput);

    if (isTranscribing) {
      stopListening();
      stopAllSpeech();
      setTimeout(async () => {
        const transcript = finalTranscript || currentTranscript;
        console.log("Processing transcript:", { finalTranscript, currentTranscript, used: transcript });
        if (transcript && transcript.trim() !== "") {
          setIsProcessingInput(true);
          try {
            await handleUserInput(transcript);
          } catch (error) {
            console.error("Error processing transcript:", error);
            addBotMessage("Sorry, I couldn't process your input. Please try again.");
          } finally {
            setIsProcessingInput(false);
          }
        } else {
          console.log("No valid transcript");
          addBotMessage("I didn't catch that. Could you please try again?");
        }
      }, 500);
    } else if (!isProcessingInput) {
      stopAllSpeech();

      try {
        startListening(selectedLanguage);
        console.log(`Started listening in language: ${selectedLanguage}`);
      } catch (error) {
        console.error("Failed to start listening:", error);
        toast({
          title: "Speech Recognition Error",
          description: "Failed to start speech recognition. Please check your microphone permissions or try again.",
          variant: "destructive"
        });
      }
    } else {
      console.log("toggleRecording skipped: processing input");
    }
  }, [
    hasRecognitionSupport,
    isTranscribing,
    finalTranscript,
    currentTranscript,
    selectedLanguage,
    startListening,
    stopListening,
    isProcessingInput,
    stopAllSpeech,
    toast,
    handleUserInput,
    addBotMessage
  ]);

  // Handle language switch: stop current speech immediately & announce in new language
  const handleLanguageChange = useCallback((newLang: string) => {
    stopAllSpeech();
    setSelectedLanguage(newLang);

    const nextField = getNextEmptyField(newLang);
    const switchAck = getLocalizedSwitch(newLang);
    let fullMsg = switchAck;

    if (nextField) {
      fullMsg = `${switchAck} ${nextField.question}`;
      setLastAskedQuestion(nextField.question);
      currentContext.current = {
        lastQuestion: nextField.question,
        currentSectionId: nextField.sectionId,
        currentFieldKey: nextField.fieldKey
      };
    }

    addBotMessage(fullMsg);

    const langObj = GNANI_LANGUAGES.find(l => l.code === newLang);
    toast({
      title: "Language Changed",
      description: `Voice & recognition set to ${langObj?.native} (${langObj?.name})`,
    });
  }, [stopAllSpeech, getNextEmptyField, addBotMessage, toast]);

  // Toggle speech synthesis
  const toggleSpeech = () => {
    setSpeechEnabled(prev => {
      if (prev) {
        stopAllSpeech();
      }
      return !prev;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md max-w-3xl mx-auto p-4 flex flex-col h-full border border-border/60">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b">
        <h2 className="text-base font-bold flex items-center gap-2 text-slate-800">
          <span className="text-blue-600">
            <Volume2 size={18} />
          </span>
          Voice Assistant
        </h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Indic Language Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 rounded-md px-2 py-1 border border-slate-200">
            <Languages className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-xs bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
              title="Select Voice Language"
            >
              {GNANI_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.native} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {gnaniCredits !== null && (
            <span
              className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium whitespace-nowrap"
              title="Gnani.ai Speech API Credit Balance (TTS & STT)"
            >
              Gnani: {gnaniCredits.toLocaleString()} cr
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={toggleSpeech}
            title={speechEnabled ? "Disable speech" : "Enable speech"}
          >
            {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Button>
        </div>
      </div>
      
      {/* Chat history */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 mb-4 bg-gray-50 rounded-md"
        style={{ minHeight: "300px", maxHeight: "50vh" }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`mb-4 flex ${message.sender === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'bot' 
                    ? 'bg-blue-50 text-blue-900 rounded-bl-none'
                    : 'bg-blue-500 text-white rounded-br-none'
                } ${message.thinking ? 'italic text-opacity-70' : ''}`}
              >
                {message.text}
                {message.thinking && (
                  <span className="ml-2 inline-block animate-pulse">...</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              Click the microphone button below to start filling out your form with voice input.
            </p>
          </div>
        )}
      </div>
      
      {/* Microphone button */}
      <div className="flex items-center justify-center mb-4">
        <button
          onClick={handleToggleRecording}
          disabled={isProcessingInput || isNlpProcessing}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all
            ${isTranscribing 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg transform scale-105'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'}
            ${(isProcessingInput || isNlpProcessing) ? 'opacity-70 cursor-not-allowed' : ''}`}
          title={isTranscribing ? 'Stop recording' : 'Start recording'}
        >
          {isTranscribing ? (
            <MicOff size={24} className="animate-pulse" />
          ) : (
            <Mic size={24} />
          )}
          
          {(isProcessingInput || isNlpProcessing) && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 items-center justify-center">
                <span className="text-xs text-white">...</span>
              </span>
            </span>
          )}
        </button>
      </div>
      
      {/* Status indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-500 mb-2">
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isTranscribing ? 'bg-red-500' : 'bg-gray-300'}`}></div>
          <span>{isTranscribing ? 'Listening' : 'Mic off'}</span>
        </div>
        
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span>{isSpeaking ? 'Speaking' : 'Silent'}</span>
        </div>
        
        <div className="flex items-center justify-center gap-1 p-2 bg-gray-100 rounded">
          <div className={`w-2 h-2 rounded-full ${isProcessingInput || isNlpProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
          <span>{isProcessingInput || isNlpProcessing ? 'Processing' : 'Ready'}</span>
        </div>
      </div>
      
      {/* Transcription display */}
      {isTranscribing && currentTranscript && (
        <div className="bg-gray-100 p-3 rounded-md mb-4 animate-pulse">
          <p className="text-gray-600 italic">{currentTranscript}</p>
        </div>
      )}
      
      {/* Help text */}
      <div className="text-xs text-gray-400 text-center">
        {isTranscribing 
          ? "Speak clearly. When finished, click the button or pause for a few seconds."
          : "Click the microphone and speak to fill your form. Try: 'My name is...'"
        }
      </div>
    </div>
  );
}