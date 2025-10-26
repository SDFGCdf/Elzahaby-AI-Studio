# Developer Notes - ملاحظات المطور

## 🏗️ Architecture Overview

### Component Structure

```
Voice Assistant System
│
├── UI Layer (VoiceSettings.tsx)
│   ├── Settings Modal
│   ├── Voice Type Selector
│   ├── Language Selector
│   └── Control Sliders
│
├── Logic Layer (useVoiceAssistant.ts)
│   ├── Speech Recognition Handler
│   ├── Speech Synthesis Handler
│   ├── State Management
│   └── Error Handling
│
├── Intelligence Layer (assistantPersonality.ts)
│   ├── Pattern Matching
│   ├── Response Generation
│   ├── Context Enhancement
│   └── Personality Database
│
└── Integration Layer (ElzahabyAssistant.tsx)
    ├── Voice Mode Toggle
    ├── Auto-Speak Logic
    ├── UI Coordination
    └── Message Flow Control
```

## 🔧 Technical Implementation

### 1. Voice Recognition (useVoiceAssistant.ts)

```typescript
// Key implementation details:
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Configuration
recognition.continuous = false;      // One-shot recognition
recognition.interimResults = false;  // Final results only
recognition.lang = config.language;  // Dynamic language setting

// Event handlers
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  onTranscript(transcript);
};
```

### 2. Speech Synthesis (useVoiceAssistant.ts)

```typescript
// Key implementation details:
const utterance = new SpeechSynthesisUtterance(text);

// Configuration
utterance.rate = config.speechRate;   // 0.5 - 2.0
utterance.pitch = config.pitch;       // 0.5 - 2.0
utterance.volume = config.volume;     // 0.0 - 1.0
utterance.lang = config.language;     // Language code

// Voice selection
const voices = window.speechSynthesis.getVoices();
const selectedVoice = voices.find(v => v.name.includes(config.voiceName));
```

### 3. Personality System (assistantPersonality.ts)

```typescript
// Pattern matching approach
const patterns = {
  whoAreYou: [/من أنت|ما اسمك|who are you/i],
  aboutDeveloper: [/من هو محمد الذهبي|who is mohamed/i],
  // ...
};

// Response selection
const responses = personalityResponses[category];
const randomResponse = responses[Math.floor(Math.random() * responses.length)];
```

### 4. Settings Persistence

```typescript
// Save to localStorage
localStorage.setItem('elzahabyVoiceConfig', JSON.stringify(config));

// Load from localStorage
const saved = localStorage.getItem('elzahabyVoiceConfig');
const config = saved ? JSON.parse(saved) : defaultConfig;
```

## 🎨 UI/UX Patterns

### Visual States

```typescript
// Voice mode indicator
{isVoiceMode && (
  <motion.div className="status-bar">
    {isListening ? 'جاري الاستماع...' :
     isSpeaking ? 'جاري التحدث...' :
     'المساعد الصوتي نشط'}
  </motion.div>
)}
```

### Icon States

```typescript
// Phone icon with pulsing animation
{isVoiceMode ? (
  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }}>
    <PhoneCall />
  </motion.div>
) : <PhoneCall />}
```

## 🔄 Data Flow

### Voice Input Flow

```
User speaks → Web Speech API → onresult event →
handleVoiceTranscript → setInputText →
setTimeout → handleSendMessage →
getPersonalityResponse (check) →
AI API or Personality Response →
setMessages → (if autoSpeak) → speak()
```

### Settings Flow

```
User changes setting → handleConfigChange →
setVoiceConfig → localStorage.setItem →
useEffect (in useVoiceAssistant) →
Update speech recognition/synthesis config
```

## 🧪 Testing Considerations

### Voice Recognition Testing

```typescript
// Test cases to consider:
1. Microphone permission denied
2. No speech detected
3. Background noise interference
4. Different accents and dialects
5. Network interruptions
6. Browser compatibility

// Error handling example:
recognition.onerror = (event) => {
  if (event.error === 'no-speech') {
    toast.error('لم يتم اكتشاف صوت');
  } else if (event.error === 'not-allowed') {
    toast.error('يرجى السماح بالوصول للميكروفون');
  }
};
```

### Speech Synthesis Testing

```typescript
// Test cases:
1. Voice not available
2. Audio context suspended
3. Long text handling
4. Special characters in text
5. Different languages

// Voice availability check:
const voices = window.speechSynthesis.getVoices();
if (voices.length === 0) {
  // Handle no voices available
}
```

## 🔒 Security & Privacy

### Data Handling

- **No server-side storage**: All voice data is processed client-side
- **Local storage only**: Settings saved in browser's localStorage
- **No recording**: Audio is not recorded, only transcribed
- **Secure API calls**: Only transcripts sent to AI API

### Best Practices

```typescript
// 1. Validate user input
const sanitizedText = DOMPurify.sanitize(userInput);

// 2. Limit transcript length
if (transcript.length > MAX_LENGTH) {
  transcript = transcript.substring(0, MAX_LENGTH);
}

// 3. Clear sensitive data
utterance.onend = () => {
  utterance = null; // Clear reference
};
```

## 🚀 Performance Optimization

### Memory Management

```typescript
// Cleanup on unmount
useEffect(() => {
  return () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };
}, []);
```

### Debouncing & Throttling

```typescript
// Prevent rapid-fire voice triggers
const handleVoiceTranscript = (transcript: string) => {
  setInputText(transcript);
  if (transcript.trim()) {
    setTimeout(() => handleSendMessage(), 500); // 500ms delay
  }
};
```

### React Optimization

```typescript
// Memoize expensive computations
const personalityCheck = useMemo(
  () => getPersonalityResponse(inputText),
  [inputText]
);

// Callback stability
const speak = useCallback((text: string) => {
  // Implementation
}, [config]);
```

## 🌍 Internationalization

### Language Support

Currently supported:
- ar-EG (Arabic - Egypt) ✅
- ar-SA (Arabic - Saudi Arabia) ✅
- en-US (English - United States) ✅
- en-GB (English - United Kingdom) ✅

Adding new language:

```typescript
// 1. Add to languages array in VoiceSettings.tsx
{ code: 'fr-FR', label: 'Français' }

// 2. Add response patterns in assistantPersonality.ts
greeting: [
  /^(مرحبا|hello|bonjour)$/i
]

// 3. Test voice availability
const voices = window.speechSynthesis.getVoices();
const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
```

## 🐛 Common Issues & Solutions

### Issue: Voice not working

```typescript
// Solution: Check browser compatibility
if (!('SpeechRecognition' in window) &&
    !('webkitSpeechRecognition' in window)) {
  console.error('Speech Recognition not supported');
  // Show user-friendly message
}
```

### Issue: Voices not loading

```typescript
// Solution: Wait for voices to load
window.speechSynthesis.addEventListener('voiceschanged', () => {
  const voices = window.speechSynthesis.getVoices();
  console.log('Voices loaded:', voices.length);
});
```

### Issue: Recognition stops unexpectedly

```typescript
// Solution: Handle onend event
recognition.onend = () => {
  if (shouldContinueListening) {
    recognition.start(); // Restart
  }
};
```

## 📦 Dependencies

### Production Dependencies

```json
{
  "@google/genai": "0.12.0",      // Gemini AI API
  "framer-motion": "11.2.12",     // Animations
  "lucide-react": "0.395.0",      // Icons
  "sonner": "1.5.0",              // Toast notifications
  "react": "18.3.1",              // Core framework
  "react-dom": "18.3.1"           // DOM rendering
}
```

### Browser APIs Used

- Web Speech API (SpeechRecognition)
- Speech Synthesis API (SpeechSynthesisUtterance)
- Local Storage API
- Audio Context API (for Gemini TTS)

## 🔄 State Management

### Voice Config State

```typescript
interface VoiceConfig {
  voiceGender: 'male' | 'female';
  voiceName: string;
  speechRate: number;      // 0.5 - 2.0
  pitch: number;           // 0.5 - 2.0
  volume: number;          // 0.0 - 1.0
  autoSpeak: boolean;
  language: string;        // BCP 47 language tag
}
```

### Assistant State

```typescript
const [isVoiceMode, setIsVoiceMode] = useState(false);
const [isListening, setIsListening] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(initialConfig);
```

## 📝 Code Style Guidelines

### Naming Conventions

- Components: PascalCase (VoiceSettings)
- Hooks: camelCase with 'use' prefix (useVoiceAssistant)
- Utils: camelCase (getPersonalityResponse)
- Constants: UPPER_SNAKE_CASE (MAX_TRANSCRIPT_LENGTH)

### File Organization

```
components/
  features/           // Feature-specific components
    VoiceSettings.tsx // One component per file
hooks/
  useVoiceAssistant.ts // Reusable logic
utils/
  assistantPersonality.ts // Helper functions
```

### TypeScript Best Practices

```typescript
// Use interfaces for objects
interface VoiceConfig { ... }

// Use type for unions/primitives
type AiMode = 'fast' | 'normal' | 'thinking';

// Avoid 'any', use specific types
const voices: SpeechSynthesisVoice[] = window.speechSynthesis.getVoices();
```

## 🎯 Future Development Roadmap

### Phase 1: Enhancement (Current)
- ✅ Basic voice recognition
- ✅ Speech synthesis
- ✅ Settings UI
- ✅ Personality system

### Phase 2: Advanced Features
- [ ] Emotion detection in voice
- [ ] Custom voice training
- [ ] Background noise cancellation
- [ ] Multi-speaker recognition

### Phase 3: Integration
- [ ] Voice commands for UI control
- [ ] Voice-based file upload
- [ ] Real-time translation
- [ ] Voice authentication

## 🤝 Contributing

When contributing to the voice assistant:

1. Test on multiple browsers
2. Test with different languages
3. Test microphone permissions
4. Update documentation
5. Add error handling
6. Follow TypeScript best practices
7. Write clear commit messages

## 📞 Support

For technical questions or issues:
- Check browser console for errors
- Verify microphone permissions
- Test with different browsers
- Review error messages in toast notifications

---

**Last Updated:** October 26, 2025
**Version:** 2.0.0
**Maintainer:** Mohamed Elzahaby
