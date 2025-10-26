import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

// Base64 decoding function for browser
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom decoder for raw PCM audio data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper function to create a WAV file from raw PCM data.
const createWavBlob = (pcmData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number): Blob => {
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat for PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write PCM data
    const pcmAsUint8 = new Uint8Array(pcmData);
    for (let i = 0; i < pcmData.length; i++) {
        view.setUint8(44 + i, pcmAsUint8[i]);
    }

    return new Blob([view], { type: 'audio/wav' });
};


const voices = [
    // English (US)
    { name: 'Zephyr', description: 'US English, Female, Bright', sampleText: 'Hello, I can read any text you provide in a clear voice.' },
    { name: 'Puck', description: 'US English, Male, Upbeat', sampleText: 'Hello, I can read any text you provide in a clear voice.' },
    { name: 'Autonoe', description: 'US English, Female, Calm & Soothing', sampleText: 'Hello, I can read any text you provide in a calm voice.' },
    { name: 'Zubenelgenubi', description: 'US English, Male, Deep & Authoritative', sampleText: 'Hello, I can read any text you provide in a clear voice.' },
    { name: 'Leda', description: 'US English, Female, Youthful', sampleText: 'Hi! I can read your text out loud for you!'},
    
    // English (UK)
    { name: 'Charon', description: 'British English, Male, Informative', sampleText: 'Hello, I can read any text you provide in a clear voice.' },
    { name: 'Despina', description: 'British English, Female, Elegant', sampleText: 'Hello, I can read any text you provide in a clear voice.' },
    { name: 'Umbriel', description: 'British English, Male, Storyteller', sampleText: 'Hello, I can read any text you provide in a clear voice.' },

    // Arabic
    { name: 'Kore', description: 'Arabic, Male, Calm', sampleText: 'مرحباً، يمكنني قراءة أي نص تقدمه بصوت واضح.' },
    { name: 'Sadachbia', description: 'Arabic, Female, Formal', sampleText: 'مرحباً، يمكنني قراءة أي نص تقدمه بصوت واضح.' },

    // German
    { name: 'Fenrir', description: 'German, Male, Firm', sampleText: 'Hallo, ich kann jeden von Ihnen bereitgestellten Text mit klarer Stimme vorlesen.' },
    { name: 'Laomedeia', description: 'German, Female, Clear', sampleText: 'Hallo, ich kann jeden von Ihnen bereitgestellten Text mit klarer Stimme vorlesen.' },

    // Spanish
    { name: 'Gacrux', description: 'Spanish, Male, Warm', sampleText: 'Hola, puedo leer cualquier texto que proporciones con una voz clara.' },
    { name: 'Callirrhoe', description: 'Spanish, Female, Expressive', sampleText: 'Hola, puedo leer cualquier texto que proporciones con una voz clara.' },

    // French
    { name: 'Orus', description: 'French, Male, Sophisticated', sampleText: 'Bonjour, je peux lire n\'importe quel texte que vous fournissez d\'une voix claire.' },
    { name: 'Erinome', description: 'French, Female, Melodious', sampleText: 'Bonjour, je peux lire n\'importe quel texte que vous fournissez d\'une voix claire.' },
];

const speakerColors = ['bg-yellow-400', 'bg-purple-400', 'bg-green-400', 'bg-blue-400', 'bg-red-400', 'bg-indigo-400'];

const AudioTools: React.FC = () => {
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [styleText, setStyleText] = useState('Speak Egyptian Arabic loudly in a calm, friendly, narrative style.');
    const [mainText, setMainText] = useState('');
    const [volume, setVolume] = useState(1); // 0 to 4 range for gain
    const [audioData, setAudioData] = useState<Uint8Array | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null);

    const [speakers, setSpeakers] = useState([
        { id: 1, name: 'Speaker 1', voice: 'Zephyr', color: speakerColors[0] },
        { id: 2, name: 'Speaker 2', voice: 'Puck', color: speakerColors[1] },
    ]);
    
    const [dialogue, setDialogue] = useState([
        { id: 1, speakerId: 1, text: "Hello! We're excited to show you our native speech capabilities" },
        { id: 2, speakerId: 2, text: "Where you can direct a voice, create realistic dialog, and so much more. Edit these placeholders to get started." },
    ]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
        }
    }, []);
    
    const handleAddDialog = () => {
        // The multi-speaker API currently supports exactly two speakers.
        // This function will now add a new dialogue turn, alternating between the two existing speakers.
        const lastSpeakerId = dialogue.length > 0 ? dialogue[dialogue.length - 1].speakerId : 2;
        const nextSpeakerId = lastSpeakerId === 1 ? 2 : 1;
    
        const newDialogueTurn = {
            id: Date.now(),
            speakerId: nextSpeakerId,
            text: '',
        };
    
        setDialogue(prevDialogue => [...prevDialogue, newDialogueTurn]);
    };
    
    const handleDialogueChange = (id: number, newText: string) => {
        setDialogue(currentDialogue => currentDialogue.map(d => d.id === id ? { ...d, text: newText } : d));
    };
    
    const handleSpeakerChange = (id: number, field: 'name' | 'voice', value: string) => {
        setSpeakers(currentSpeakers => currentSpeakers.map(s => s.id === id ? { ...s, [field]: value } : s));
    };


    const handlePlayPause = () => {
        if (previewSourceRef.current) {
            try { previewSourceRef.current.stop(); } catch (e) {}
            previewSourceRef.current = null;
        }

        const audioCtx = audioContextRef.current;
        if (!audioBuffer || !audioCtx) return;
    
        if (isPlaying) {
            audioCtx.suspend().then(() => setIsPlaying(false));
        } else {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => setIsPlaying(true));
            } else {
                if (sourceRef.current) {
                    sourceRef.current.onended = null;
                    sourceRef.current.stop();
                }
                const newSource = audioCtx.createBufferSource();
                newSource.buffer = audioBuffer;
                newSource.connect(gainNodeRef.current!);
                newSource.start(0);
                newSource.onended = () => {
                    setIsPlaying(false);
                    sourceRef.current = null;
                };
                sourceRef.current = newSource;
                setIsPlaying(true);
            }
        }
    };
    
    const handlePreviewVoice = async (voiceName: string, sampleText: string) => {
        if (!sampleText) return;
        if (previewSourceRef.current) { try { previewSourceRef.current.stop(); } catch (e) {} }
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch (e) {}
            setIsPlaying(false);
        }
        
        setIsPreviewLoading(voiceName);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: sampleText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                const audioBytes = decode(base64Audio);
                const buffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
                
                const newSource = audioContextRef.current.createBufferSource();
                newSource.buffer = buffer;
                newSource.connect(gainNodeRef.current!);
                newSource.start(0);
                newSource.onended = () => {
                    if (previewSourceRef.current === newSource) {
                        previewSourceRef.current = null;
                    }
                };
                previewSourceRef.current = newSource;
            } else {
                throw new Error("No audio data received for preview.");
            }
            
        } catch (e: any) {
            console.error(e);
            setError(`Preview failed: ${e.message}`);
        } finally {
            setIsPreviewLoading(null);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        if (previewSourceRef.current) { try { previewSourceRef.current.stop(); } catch(e) {} }
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            try { sourceRef.current.stop(); } catch(e) {}
            sourceRef.current = null;
            setIsPlaying(false);
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            let fullPrompt = '';
            let speechConfig: any;
    
            if (mode === 'single') {
                if (!mainText.trim()) {
                    setError("Please enter some text to generate speech.");
                    setIsLoading(false);
                    return;
                }
                fullPrompt = styleText ? `Say with emotion (${styleText}): ${mainText}` : mainText;
                speechConfig = {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
                };
            } else { // Multi-speaker mode
                if (dialogue.some(d => !d.text.trim())) {
                     setError("Please fill out all dialogue fields.");
                     setIsLoading(false);
                     return;
                }
                const speakerMap = new Map(speakers.map(s => [s.id, s.name]));
                const dialogueText = dialogue.map(d => `${speakerMap.get(d.speakerId)}: ${d.text}`).join('\n');
                
                fullPrompt = styleText ? `${styleText}\n${dialogueText}` : dialogueText;
    
                speechConfig = {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakers.map(speaker => ({
                            speaker: speaker.name,
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: speaker.voice }
                            }
                        }))
                    }
                };
            }
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: fullPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: speechConfig,
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                const audioBytes = decode(base64Audio);
                setAudioData(audioBytes);
                const buffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
                setAudioBuffer(buffer);
            } else {
                throw new Error("No audio data received from the API.");
            }
            
        } catch (e: any) {
            console.error(e);
            setError(`Failed to generate audio: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!audioData) return;
        const blob = createWavBlob(audioData, 24000, 1, 16);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'elzahaby-ai-audio.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = value;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row lg:h-full bg-gray-900">
            {/* Main Content */}
            <div className="p-4 lg:p-8 flex flex-col min-w-0 lg:flex-1 lg:overflow-y-auto">
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">Speech</h2>
                <p className="text-gray-400 mb-6">Generate high-quality, realistic speech with single or multiple speakers.</p>
                
                {mode === 'single' ? (
                    <div className="flex flex-col flex-grow">
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 block mb-2">Style Instructions</label>
                            <input type="text" value={styleText} onChange={(e) => setStyleText(e.target.value)} placeholder="Read aloud in a warm and friendly tone..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200" />
                        </div>
                        <div className="flex-grow flex flex-col">
                            <label className="text-sm text-gray-400 block mb-2">Text</label>
                            <textarea 
                                value={mainText}
                                onChange={(e) => setMainText(e.target.value)}
                                placeholder="Start writing or paste text here to generate speech..."
                                className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 resize-none flex-grow"
                            ></textarea>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="mb-4">
                            <label className="text-sm text-gray-400 block mb-2">Style instructions</label>
                            <input type="text" value={styleText} onChange={(e) => setStyleText(e.target.value)} placeholder="Read aloud in a warm, welcoming tone" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200" />
                        </div>
                        <div className="space-y-4 pr-2 pb-4">
                            <h3 className="text-lg font-semibold text-gray-300">Script builder</h3>
                            {dialogue.map((turn) => {
                                const speaker = speakers.find(s => s.id === turn.speakerId);
                                return (
                                    <div key={turn.id}>
                                        <label className="text-sm text-gray-400 block mb-2 flex items-center">
                                            <span className={`w-3 h-3 rounded-full mr-2 ${speaker?.color}`}></span>
                                            {speaker?.name}
                                        </label>
                                        <textarea
                                            value={turn.text}
                                            onChange={(e) => handleDialogueChange(turn.id, e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 resize-none"
                                            rows={3}
                                        />
                                    </div>
                                );
                            })}
                            <button onClick={handleAddDialog} className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                <span>Add dialog</span>
                            </button>
                        </div>
                    </div>
                )}


                <div className="mt-6 flex items-center justify-end space-x-4 flex-shrink-0">
                    {error && <p className="text-red-400 text-sm flex-grow text-left">{error}</p>}
                     <button 
                        onClick={handlePlayPause} 
                        disabled={!audioBuffer || isLoading} 
                        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                        aria-label={isPlaying ? "Pause audio" : "Play audio"}
                    >
                        {isPlaying ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                    <button onClick={handleDownload} disabled={!audioData || isLoading} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                        Download
                    </button>
                    <button onClick={handleGenerate} disabled={isLoading} className="bg-yellow-400 text-gray-900 font-bold py-2 px-6 rounded-lg hover:bg-yellow-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            <div className="w-full lg:w-1/3 lg:max-w-sm p-6 bg-gray-800/50 border-t lg:border-t-0 lg:border-l border-gray-700/50 flex flex-col lg:overflow-y-auto flex-shrink-0">
                <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Run Settings</h3>
                
                <div className="mb-6 flex-shrink-0">
                    <label className="text-sm text-gray-400 block mb-2">Mode</label>
                    <div className="flex bg-gray-700/50 p-1 rounded-lg">
                        <button onClick={() => setMode('single')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === 'single' ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-gray-300 hover:bg-gray-700'}`}>Single-speaker</button>
                        <button onClick={() => setMode('multi')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === 'multi' ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-gray-300 hover:bg-gray-700'}`}>Multi-speaker</button>
                    </div>
                </div>

                <div className="mb-6 flex-shrink-0">
                    <label className="text-sm text-gray-400 block mb-2">Volume ({Math.round(volume * 100)}%)</label>
                     <input type="range" min="0" max="4" step="0.1" value={volume} onChange={handleVolumeChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                </div>
                
                {mode === 'single' ? (
                     <div className="flex flex-col flex-grow min-h-0">
                        <label className="text-sm text-gray-400 block mb-2 flex-shrink-0">Voice</label>
                        <div className="space-y-2 lg:overflow-y-auto pr-2">
                            {voices.map(voice => (
                                <div key={voice.name} className={`p-3 rounded-lg border-2 flex items-center justify-between ${selectedVoice === voice.name ? 'border-yellow-400 bg-yellow-400/10' : 'border-transparent bg-gray-700/50 hover:bg-gray-700/80'}`}>
                                    <div onClick={() => setSelectedVoice(voice.name)} className="cursor-pointer flex-grow">
                                        <p className={`font-semibold ${selectedVoice === voice.name ? 'text-yellow-300' : 'text-gray-200'}`}>{voice.name}</p>
                                        <p className="text-xs text-gray-400">{voice.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handlePreviewVoice(voice.name, voice.sampleText)}
                                        disabled={isLoading || isPreviewLoading !== null}
                                        className="p-2 rounded-full hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                                        aria-label={`Preview voice ${voice.name}`}
                                    >
                                        {isPreviewLoading === voice.name ? (
                                            <svg className="animate-spin h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-grow min-h-0 space-y-4 lg:overflow-y-auto pr-2">
                        {speakers.map(speaker => {
                            const currentVoice = voices.find(v => v.name === speaker.voice);
                            return (
                                <div key={speaker.id} className="p-4 bg-gray-700/50 rounded-lg">
                                    <h4 className="text-md font-semibold mb-3 flex items-center">
                                        <span className={`w-3 h-3 rounded-full mr-2 ${speaker.color}`}></span>
                                        {speaker.name} settings
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={speaker.name}
                                                onChange={(e) => handleSpeakerChange(speaker.id, 'name', e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Voice</label>
                                            <div className="flex items-center space-x-2">
                                                <div className="relative flex-grow">
                                                    <select
                                                        value={speaker.voice}
                                                        onChange={(e) => handleSpeakerChange(speaker.id, 'voice', e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200 appearance-none pr-8"
                                                    >
                                                        {voices.map(v => <option key={v.name} value={v.name}>{v.name} - {v.description.split(',')[0]}</option>)}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handlePreviewVoice(speaker.voice, voices.find(v => v.name === speaker.voice)?.sampleText || '')}
                                                    disabled={isLoading || isPreviewLoading !== null}
                                                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                    aria-label={`Preview voice ${speaker.voice}`}
                                                >
                                                    {isPreviewLoading === speaker.voice ? (
                                                        <svg className="animate-spin h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                            {currentVoice && (
                                                <p className="text-xs text-gray-400 mt-2">{currentVoice.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioTools;