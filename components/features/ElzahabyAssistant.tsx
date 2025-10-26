
import React, { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Use GenerateContentParameters instead of the deprecated GenerateContentRequest.
import { GoogleGenAI, Chat, Modality, GenerateContentParameters } from "@google/genai";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Paperclip, Send, Mic, Sparkles, Zap, BrainCircuit, Bot, User, Volume2, FileImage, FileVideo, X, Search, Link as LinkIcon, Download, Settings, PhoneCall } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import VoiceSettings, { VoiceConfig } from './VoiceSettings';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { getPersonalityResponse, enhanceAIPrompt } from '../../utils/assistantPersonality';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPE DEFINITIONS ---
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  attachments?: { type: string; data: string; name: string }[];
  sources?: { uri: string; title: string }[];
  isSpeaking?: boolean;
}

interface Attachment {
  file: File;
  base64: string;
  type: string;
  preview: string;
}

type AiMode = 'fast' | 'normal' | 'thinking';

// --- UTILITY FUNCTIONS ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}


// --- MARKDOWN RENDERER ---
const renderer = new marked.Renderer();
// FIX: The signature for renderer.link can vary between versions of `marked`, causing type errors.
// This implementation manually constructs the link to be compatible, adding target="_blank".
renderer.link = (href: any, title: any, text: any) => {
    return `<a href="${href}" title="${
        title || ''
    }" target="_blank" rel="noopener noreferrer">${text}</a>`;
};


// --- MAIN COMPONENT ---
const ElzahabyAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>('normal');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() => {
    const saved = localStorage.getItem('elzahabyVoiceConfig');
    return saved ? JSON.parse(saved) : {
      voiceGender: 'male',
      voiceName: 'Puck',
      speechRate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoSpeak: true,
      language: 'ar-EG',
    };
  });

  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleVoiceTranscript = (transcript: string) => {
    setInputText(transcript);
    if (transcript.trim()) {
      setTimeout(() => handleSendMessage(), 500);
    }
  };

  const { isListening, isSpeaking, toggleListening, speak, stopSpeaking } = useVoiceAssistant({
    config: voiceConfig,
    onTranscript: handleVoiceTranscript,
  });

  useEffect(() => {
    // Initialize API and chat
    try {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      chatRef.current = aiRef.current.chats.create({ model: 'gemini-2.5-flash' });
      setMessages([{ id: 'init', sender: 'system', text: 'Welcome to Elzahaby Assistant! How can I help you today?' }]);
    } catch (error) {
      console.error("Initialization failed:", error);
      toast.error("Failed to initialize AI. Please check your API key.");
    }

    // Initialize Audio Context for TTS
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend && attachments.length === 0) return;

    setIsLoading(true);
    setInputText('');
    setAttachments([]);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      attachments: attachments.map(a => ({ type: a.type, data: a.preview, name: a.file.name })),
    };
    setMessages(prev => [...prev, userMessage]);

    const personalityCheck = getPersonalityResponse(textToSend);
    if (personalityCheck.shouldIntercept && personalityCheck.response) {
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        sender: 'ai',
        text: personalityCheck.response,
      };
      setTimeout(() => {
        setMessages(prev => [...prev, aiMessage]);
        if (voiceConfig.autoSpeak || isVoiceMode) {
          speak(personalityCheck.response!);
        }
        setIsLoading(false);
      }, 500);
      return;
    }

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, sender: 'ai', text: '...' }]);

    try {
      const parts: any[] = [];
      const enhancedPrompt = enhanceAIPrompt(textToSend);
      if (textToSend) parts.push({ text: enhancedPrompt });
      for (const att of attachments) {
        parts.push({ inlineData: { data: att.base64, mimeType: att.type } });
      }

      if (textToSend.startsWith('/generate ') || textToSend.startsWith('/edit ')) {
        await handleImageGeneration(textToSend, aiMessageId);
      } else {
        await handleChatCompletion(parts, aiMessageId, textToSend);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage = `Error: ${error.message || "An unknown error occurred."}`;
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: errorMessage } : msg));
      toast.error("An error occurred while communicating with the AI.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChatCompletion = async (parts: any[], aiMessageId: string, originalText: string) => {
      if (!chatRef.current || !aiRef.current) return;
  
      let fullResponseText = '';
      let finalResponse: any;
  
      const modelMap: Record<AiMode, string> = {
          fast: 'gemini-2.5-flash',
          normal: 'gemini-2.5-flash',
          thinking: 'gemini-2.5-pro',
      };
  
      const isSearch = originalText.toLowerCase().startsWith('/search ');
      // FIX: The chat model is fixed on creation.
      // This config object is passed to `sendMessageStream` to control generation parameters for the current turn.
      // FIX: Use GenerateContentParameters instead of the deprecated GenerateContentRequest.
      const chatRequestConfig: Partial<GenerateContentParameters> & { thinkingConfig?: any } = {};
      
      if (aiMode === 'thinking') {
          chatRequestConfig.thinkingConfig = { thinkingBudget: 8192 };
      }
      
      if (isSearch) {
          (chatRequestConfig as any).tools = [{ googleSearch: {} }];
          parts = [{ text: originalText.replace('/search ', '') }]; // Search doesn't use images
      }
  
      // FIX: The model of a chat session cannot be changed after creation. It is a read-only property.
      // The `aiMode` will instead control `thinkingConfig` for the specific message.
  
      // FIX: The `message` property should be the array of parts directly, not an object containing a `parts` property.
      const responseStream = await chatRef.current.sendMessageStream({ message: parts, config: Object.keys(chatRequestConfig).length > 0 ? chatRequestConfig : undefined });
  
      for await (const chunk of responseStream) {
          fullResponseText += chunk.text;
          finalResponse = chunk;
          setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, text: fullResponseText + '...' } : msg
          ));
      }
  
      const sources = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
      setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: fullResponseText, sources: sources.length > 0 ? sources : undefined } : msg
      ));

      if ((voiceConfig.autoSpeak || isVoiceMode) && fullResponseText) {
        speak(fullResponseText);
      }
  };


  const handleImageGeneration = async (prompt: string, aiMessageId: string) => {
    if (!aiRef.current) return;
    
    const command = prompt.startsWith('/generate ') ? '/generate' : '/edit';
    const textPrompt = prompt.replace(command + ' ', '');

    const contents: any = { parts: [{ text: textPrompt }] };
    if (command === '/edit' && attachments.length > 0) {
        contents.parts.unshift({ inlineData: { data: attachments[0].base64, mimeType: attachments[0].type } });
    } else if (command === '/edit' && attachments.length === 0) {
        throw new Error("The /edit command requires an image attachment.");
    }
    
    try {
        const response = await aiRef.current.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
            
            const newAiMessage: ChatMessage = {
                id: aiMessageId,
                sender: 'ai',
                text: `Here is the image you requested.`,
                attachments: [{ type: mimeType, data: imageUrl, name: 'generated_image.png' }]
            };
            setMessages(prev => prev.map(msg => msg.id === aiMessageId ? newAiMessage : msg));
        } else {
             throw new Error(response.text || "No image was generated by the AI.");
        }
    } catch (e: any) {
        console.error("Image generation failed:", e);
        const userFriendlyError = (e.message || '').includes("SAFETY") 
            ? "Request blocked for safety reasons. Please adjust your prompt."
            : `Image generation failed: ${e.message}`;
        throw new Error(userFriendlyError);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    toast.promise(
      Promise.all(files.map(async (file) => {
        const base64 = await blobToBase64(file);
        return {
          file,
          base64,
          type: file.type,
          preview: URL.createObjectURL(file),
        };
      })),
      {
        loading: 'Processing files...',
        success: (newAttachments) => {
          setAttachments(prev => [...prev, ...newAttachments]);
          return `${newAttachments.length} file(s) attached successfully!`;
        },
        error: 'Failed to process files.',
      }
    );
     // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  };

  const handleConfigChange = (newConfig: VoiceConfig) => {
    setVoiceConfig(newConfig);
    localStorage.setItem('elzahabyVoiceConfig', JSON.stringify(newConfig));
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      stopSpeaking();
      setIsVoiceMode(false);
      toast.success('تم إيقاف المساعد الصوتي');
    } else {
      setIsVoiceMode(true);
      toast.success('تم تفعيل المساعد الصوتي التفاعلي');
      toggleListening();
    }
  };
  
  const handleTextToSpeech = async (messageId: string, text: string) => {
    if (!aiRef.current || !audioContextRef.current) return;
    
    // Stop any currently playing audio
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      setMessages(prev => prev.map(msg => ({ ...msg, isSpeaking: false })));
    }

    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isSpeaking: true } : msg));
    
    try {
        const response = await aiRef.current.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say with a calm and helpful tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio && audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            const audioBytes = decode(base64Audio);
            const buffer = await decodeAudioData(audioBytes, audioContextRef.current);
            const newSource = audioContextRef.current.createBufferSource();
            newSource.buffer = buffer;
            newSource.connect(audioContextRef.current.destination);
            newSource.start(0);
            newSource.onended = () => {
                setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isSpeaking: false } : msg));
                audioSourceRef.current = null;
            };
            audioSourceRef.current = newSource;
        } else {
            throw new Error("No audio data received.");
        }
    } catch (e: any) {
      console.error("TTS failed:", e);
      toast.error(`Text-to-speech failed: ${e.message}`);
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, isSpeaking: false } : msg));
    }
  };

  const MemoizedChatMessage = React.memo(ChatMessageItem);

  return (
    <div className="flex flex-col h-full bg-gray-800/50">
      <Toaster position="top-center" richColors />
      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-700/50">
        <h2 className="text-lg font-bold text-yellow-400">Elzahaby Assistant</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
            title="إعدادات الصوت"
          >
            <Settings size={20} />
          </button>
          <div className="flex items-center space-x-1 bg-gray-700/50 p-1 rounded-lg">
          {(['fast', 'normal', 'thinking'] as AiMode[]).map(mode => (
            <button key={mode} onClick={() => setAiMode(mode)} className={`px-3 py-1 text-sm rounded-md transition-colors ${aiMode === mode ? 'bg-yellow-400 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-600/50'}`}>
              <div className="flex items-center space-x-1.5">
                {mode === 'fast' && <Zap size={14}/>}
                {mode === 'normal' && <Sparkles size={14}/>}
                {mode === 'thinking' && <BrainCircuit size={14}/>}
                <span className="capitalize">{mode}</span>
              </div>
            </button>
          ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => <MemoizedChatMessage key={msg.id} message={msg} onTextToSpeech={handleTextToSpeech} />)}
        <div ref={messagesEndRef} />
      </div>

      <footer className="flex-shrink-0 p-3 border-t border-gray-700/50">
        <AnimatePresence>
            {attachments.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 p-2 bg-gray-700/50 rounded-lg">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {attachments.map((att, index) => (
                            <div key={index} className="relative group">
                                {att.type.startsWith('image/') ? (
                                    <img src={att.preview} className="w-full h-20 object-cover rounded-md" alt={att.file.name} />
                                ) : (
                                    <div className="w-full h-20 bg-gray-800 rounded-md flex flex-col items-center justify-center p-1">
                                        <FileVideo size={24} className="text-purple-400"/>
                                        <p className="text-xs text-center truncate w-full" title={att.file.name}>{att.file.name}</p>
                                    </div>
                                )}
                                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={14}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {isVoiceMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 p-3 bg-gradient-to-r from-yellow-400/10 to-amber-400/10 rounded-lg border border-yellow-400/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
                  className="w-3 h-3 bg-yellow-400 rounded-full"
                />
                <span className="text-sm text-yellow-300 font-semibold">
                  {isListening ? 'جاري الاستماع...' : isSpeaking ? 'جاري التحدث...' : 'المساعد الصوتي نشط'}
                </span>
              </div>
              <button
                onClick={toggleVoiceMode}
                className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
              >
                إيقاف
              </button>
            </div>
          </motion.div>
        )}

        <div className="relative flex items-center">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-yellow-400 transition-colors">
                <Paperclip size={20} />
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*"/>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Type your message, or try commands like /generate, /edit, /search..."
              className="w-full bg-transparent p-2 pr-24 text-gray-200 resize-none focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-0 flex items-center space-x-1">
                <button
                  onClick={toggleVoiceMode}
                  className={`p-2 transition-colors relative ${isVoiceMode ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                  title="المساعد الصوتي التفاعلي"
                >
                  {isVoiceMode ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <PhoneCall size={20} />
                    </motion.div>
                  ) : (
                    <PhoneCall size={20} />
                  )}
                  {isVoiceMode && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </button>
                <button
                  onClick={toggleListening}
                  className={`p-2 transition-colors ${isListening ? 'text-red-500' : 'text-gray-400 hover:text-yellow-400'}`}
                  title="التعرف الصوتي"
                >
                  {isListening ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
                      <Mic size={20} />
                    </motion.div>
                  ) : (
                    <Mic size={20} />
                  )}
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!inputText.trim() && attachments.length === 0)}
                  className="p-2 text-gray-400 hover:text-yellow-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
            </div>
        </div>
      </footer>

      <VoiceSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={voiceConfig}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
};


// --- CHAT MESSAGE SUB-COMPONENT ---
const ChatMessageItem: React.FC<{ message: ChatMessage; onTextToSpeech: (id: string, text: string) => void; }> = ({ message, onTextToSpeech }) => {
    const Icon = message.sender === 'user' ? User : Bot;
    const bgColor = message.sender === 'user' ? 'bg-gray-700/30' : message.sender === 'system' ? 'bg-blue-900/20' : 'bg-gray-900/20';

    const [renderedContent, setRenderedContent] = useState<React.ReactNode>(null);

    useEffect(() => {
        const renderText = async () => {
            // FIX: marked.parse can return a promise, so we await it to prevent type errors.
            const html = await Promise.resolve(marked.parse(message.text, { renderer, gfm: true, breaks: true }));
            const sanitizedHtml = DOMPurify.sanitize(html as string);

            const CodeBlock = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : 'text';
                return (
                    <div className="relative my-2">
                        <div className="bg-gray-900 text-xs text-gray-400 px-3 py-1 rounded-t-md flex justify-between items-center">
                            <span>{lang}</span>
                             <button onClick={() => navigator.clipboard.writeText(String(children))} className="text-gray-400 hover:text-white text-xs">Copy</button>
                        </div>
                        <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div">
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    </div>
                );
            };

            const parts = sanitizedHtml.split(/(<pre><code class="language-\w+">[\s\S]*?<\/code><\/pre>)/g);

            const content = parts.map((part, index) => {
                if (part.startsWith('<pre><code')) {
                    const langMatch = part.match(/class="language-(\w+)"/);
                    const language = langMatch ? langMatch[1] : '';
                    const codeContent = part.replace(/<\/?pre>|<\/?code.*?>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    return <CodeBlock key={index} className={`language-${language}`}>{codeContent}</CodeBlock>;
                }
                return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            });
            setRenderedContent(<>{content}</>);
        };
        
        renderText();
    }, [message.text]);


    const renderAttachments = () => (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {message.attachments?.map((att, index) => (
                <div key={index} className="relative group">
                    {att.type.startsWith('image/') ? (
                        <img src={att.data} alt={att.name} className="rounded-lg max-h-64 w-auto" />
                    ) : (
                        <video src={att.data} controls className="rounded-lg max-h-64 w-auto" />
                    )}
                    <a href={att.data} download={att.name} className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download size={16} />
                    </a>
                </div>
            ))}
        </div>
    );
    
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-start space-x-3 p-3 rounded-lg ${bgColor}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.sender === 'user' ? 'bg-blue-500' : 'bg-yellow-500'}`}>
                <Icon size={18} className="text-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2">
                    {renderedContent || <div className="whitespace-pre-wrap">{message.text}</div>}
                </div>
                {message.attachments && renderAttachments()}
                {message.sources && (
                    <div className="mt-3 border-t border-gray-700/50 pt-2">
                        <h4 className="text-xs font-semibold text-gray-400 flex items-center"><Search size={12} className="mr-1.5"/> Sources:</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {message.sources.map((source, i) => (
                                <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="bg-gray-700/50 hover:bg-gray-700 text-xs text-blue-300 px-2 py-1 rounded-full flex items-center space-x-1">
                                    <LinkIcon size={12}/>
                                    <span className="truncate max-w-xs">{source.title || new URL(source.uri).hostname}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {message.sender === 'ai' && message.text && message.text !== '...' && (
                <button onClick={() => onTextToSpeech(message.id, message.text)} className="self-start text-gray-500 hover:text-yellow-300 transition-colors ml-2">
                    {message.isSpeaking ? (
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="text-yellow-400">
                           <Volume2 size={18} />
                        </motion.div>
                    ) : <Volume2 size={18} />}
                </button>
            )}
        </motion.div>
    );
};

export default ElzahabyAssistant;