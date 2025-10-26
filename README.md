<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Elzahaby AI Studio - مساعد الذهبي الذكي 🎙️

A comprehensive AI-powered studio with an advanced voice assistant that speaks Arabic (Egyptian dialect).

View your app in AI Studio: https://ai.studio/apps/drive/1Imxo7-fe44hkyX57_3_Q45FfqsE5mdZo

## ✨ New Features: Interactive Voice Assistant

### 🎯 What's New?
- **Interactive Voice Mode**: Full conversational voice assistant with Egyptian Arabic support
- **Smart Personality**: The assistant knows about Engineer Mohamed Elzahaby and introduces itself intelligently
- **Voice Settings**: Customize voice type (male/female), speed, pitch, and language
- **Auto-Response**: Automatic voice replies when enabled
- **Visual Indicators**: Beautiful animations showing listening/speaking states

### 🗣️ Voice Assistant Capabilities
- Recognizes Egyptian Arabic dialect (default)
- Male voice (Puck) by default, switchable to female voices
- Responds to questions about its identity and creator
- Provides detailed information about Engineer Mohamed Elzahaby
- Supports multiple languages (Arabic, English)

## 🚀 Quick Start

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## 📖 Documentation

- [Voice Assistant Features (English)](./VOICE_ASSISTANT_FEATURES.md)
- [دليل المساعد الصوتي (العربية)](./دليل_المساعد_الصوتي.md)

## 🎤 How to Use Voice Assistant

### Method 1: Interactive Mode
1. Click the phone icon 📞 in the input field
2. Start speaking - the assistant will listen and respond automatically
3. Continue the conversation naturally

### Method 2: Quick Voice Input
1. Click the microphone icon 🎤
2. Speak your message
3. Press send or Enter

### Settings
Click the settings icon ⚙️ to customize:
- Voice type (male/female)
- Voice selection
- Speech recognition language
- Speech rate, pitch, and volume
- Auto-speak toggle

## 🌟 About the Assistant

When you ask "من أنت؟" (Who are you?), the assistant responds:
> "أنا مساعد الذهبي الذكي، تم تطويري بواسطة المهندس محمد الذهبي"

When you ask about Engineer Mohamed Elzahaby, it provides detailed information about:
- Expertise in full-stack development
- Skills in graphic design and image editing
- Video editing and montage capabilities
- Education from Mansoura University (Excellent grade)
- Specialization in IT and Communications

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **AI**: Google Gemini 2.5 API
- **Voice**: Web Speech API + Speech Synthesis API
- **UI**: Tailwind CSS + Framer Motion
- **Icons**: Lucide React

## 📁 Project Structure

```
project/
├── components/
│   └── features/
│       ├── ElzahabyAssistant.tsx (Main chat component with voice)
│       ├── VoiceSettings.tsx (Voice configuration UI)
│       ├── Dashboard.tsx
│       ├── AppGenerator.tsx
│       ├── AudioTools.tsx
│       └── ImageTools.tsx
├── hooks/
│   ├── useVoiceAssistant.ts (Voice assistant logic)
│   ├── useMediaQuery.ts
│   └── useSound.ts
├── utils/
│   └── assistantPersonality.ts (Smart responses & personality)
└── ...
```

## 🎨 Features

1. **Elzahaby Assistant** - AI chat with voice capabilities
2. **Image Tools** - AI image generation and editing
3. **Audio Tools** - Audio processing and generation
4. **App Generator** - Code generation tools
5. **Dashboard** - Overview of all features

## 💡 Tips for Best Experience

- Use Chrome or Edge for best voice support
- Allow microphone access when prompted
- Speak clearly in Egyptian Arabic for best recognition
- Adjust voice settings to your preference
- Enable auto-speak for hands-free experience

## 🌐 Browser Support

- ✅ Chrome (Recommended)
- ✅ Edge
- ✅ Safari
- ⚠️ Firefox (Limited voice support)

## 👨‍💻 About the Developer

**Engineer Mohamed Elzahaby**
- Expert in full-stack web development
- Professional graphic designer
- Skilled in image/logo editing and video montage
- Graduate of Mansoura University (Computer Science)
- Excellent grade in IT & Communications

## 📄 License

This project is part of Elzahaby AI Studio.

---

**Developed with ❤️ by Mohamed Elzahaby**
**Powered by Google Gemini AI**
