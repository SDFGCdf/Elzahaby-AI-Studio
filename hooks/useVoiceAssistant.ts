import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { VoiceConfig } from '../components/features/VoiceSettings';

interface UseVoiceAssistantProps {
  config: VoiceConfig;
  onTranscript: (text: string) => void;
}

export const useVoiceAssistant = ({ config, onTranscript }: UseVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      speechRecognitionRef.current = new SpeechRecognition();
      speechRecognitionRef.current.continuous = false;
      speechRecognitionRef.current.interimResults = false;

      speechRecognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      speechRecognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          toast.error('لم يتم اكتشاف صوت. حاول مرة أخرى.');
        } else if (event.error === 'not-allowed') {
          toast.error('يرجى السماح بالوصول للميكروفون.');
        } else {
          toast.error(`خطأ في التعرف الصوتي: ${event.error}`);
        }
        setIsListening(false);
      };

      speechRecognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort();
      }
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [onTranscript]);

  useEffect(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = config.language;
    }
  }, [config.language]);

  const startListening = useCallback(() => {
    if (!speechRecognitionRef.current) {
      toast.error('التعرف الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }

    try {
      setIsListening(true);
      speechRecognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      toast.error('فشل بدء التعرف الصوتي.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (speechRecognitionRef.current && isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      toast.error('تحويل النص لصوت غير مدعوم في هذا المتصفح.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.speechRate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    utterance.lang = config.language;

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(voice =>
      voice.name.includes(config.voiceName) ||
      (config.language.startsWith('ar') && voice.lang.startsWith('ar'))
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      toast.error('فشل تحويل النص لصوت.');
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [config]);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleListening,
  };
};
