import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

type ImageTool = 'Generate' | 'Edit' | 'Colorize' | 'Restore' | 'Remove BG' | 'Vectorize';

// Simple base64 encoder for browser
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


const ImageTools: React.FC = () => {
    const [activeTool, setActiveTool] = useState<ImageTool>('Generate');
    const [imageBefore, setImageBefore] = useState<string | null>(null);
    const [imageAfter, setImageAfter] = useState<string | null>("https://storage.googleapis.com/aai-web-samples/elzahaby-placeholder.png");
    const [sliderValue, setSliderValue] = useState(50);
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tools: ImageTool[] = ['Generate', 'Edit', 'Colorize', 'Restore', 'Remove BG', 'Vectorize'];
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImageBefore(result);
                setImageAfter(result); // Show the same image initially
                setActiveTool('Edit'); // Switch to edit mode after upload
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleExecute = async () => {
        if (!prompt.trim() && activeTool !== 'Edit') {
            setError("Please enter a prompt.");
            return;
        }
        if (activeTool === 'Edit' && !imageBefore) {
            setError("Please upload an image to edit.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const contents: any = { parts: [{ text: prompt }] };

            if ((activeTool === 'Edit' || activeTool === 'Colorize' || activeTool === 'Restore') && imageBefore) {
                 const base64Data = imageBefore.split(',')[1];
                 const mimeType = imageBefore.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
                 contents.parts.unshift({
                     inlineData: {
                         data: base64Data,
                         mimeType: mimeType,
                     },
                 });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: contents,
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            // More specific checks for response issues
            if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                throw new Error('Request blocked due to safety policies. Please adjust your prompt or image.');
            }
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Prompt blocked: ${response.promptFeedback.blockReason}. Please revise.`);
            }

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                const base64ImageBytes: string = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                setImageBefore(imageAfter);
                setImageAfter(imageUrl);
                setSliderValue(50);
            } else {
                 const textResponse = response.text || "The AI's response did not contain an image. Please try rephrasing your prompt.";
                 throw new Error(textResponse);
            }
        } catch (e: any) {
            console.error(e);
            let userFriendlyError = "An unexpected error occurred. Please try again.";
            const errorMessage = (e.message || '').toLowerCase();

            if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
                userFriendlyError = "Your request was blocked for safety reasons. Please modify the prompt or image and try again.";
            } else if (errorMessage.includes("api key")) {
                userFriendlyError = "There is an issue with the API configuration. Please contact the developer.";
            } else if (errorMessage.includes("invalid") || errorMessage.includes("400")) {
                userFriendlyError = "The request was invalid. Please check your prompt and ensure the uploaded image is in a supported format.";
            } else if (errorMessage.includes("did not contain an image")) {
                userFriendlyError = e.message; // Use the more specific message from the try block
            }
            
            setError(userFriendlyError);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!imageAfter || imageAfter === "https://storage.googleapis.com/aai-web-samples/elzahaby-placeholder.png") return;
        const link = document.createElement('a');
        link.href = imageAfter;
        const mimeType = imageAfter.match(/data:(.*);base64,/)?.[1] || 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        link.download = `elzahaby-ai-image.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full bg-gray-900 overflow-hidden">
            <div className="p-6 bg-gray-800/50 flex flex-col lg:w-1/3 lg:max-w-sm border-b lg:border-b-0 lg:border-r border-gray-700/50 overflow-y-auto flex-shrink-0">
                <h2 className="text-2xl font-bold text-yellow-400 mb-6">Image Tools</h2>
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {tools.map(tool => (
                        <button
                            key={tool}
                            onClick={() => {
                                setActiveTool(tool)
                                if (['Edit', 'Colorize', 'Restore', 'Remove BG', 'Vectorize'].includes(tool)) {
                                    fileInputRef.current?.click();
                                }
                            }}
                            className={`text-sm py-2 rounded-lg transition-colors text-center ${activeTool === tool ? 'bg-yellow-400 text-gray-900 font-bold' : 'text-gray-300 bg-gray-700/50 hover:bg-gray-600/50'}`}
                        >
                            {tool}
                        </button>
                    ))}
                </div>
                
                <div className="flex-grow space-y-4">
                    <label className="block">
                        <span className="text-gray-400 text-sm">Prompt</span>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1 text-gray-200 focus:ring-yellow-400 focus:border-yellow-400"
                            rows={4}
                            placeholder={activeTool === 'Edit' ? "e.g., 'Add a hat on the cat'" : "A photorealistic image of a cat programming..."}
                        />
                    </label>
                     <label className="block">
                        <span className="text-gray-400 text-sm">Upload Image</span>
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400/20 file:text-yellow-300 hover:file:bg-yellow-400/30 cursor-pointer"/>
                    </label>
                    {error && <p className="text-red-400 text-sm break-words">{error}</p>}
                </div>
                <div className="flex space-x-2 mt-4">
                    <button 
                        onClick={handleExecute}
                        disabled={isLoading}
                        className="flex-1 bg-yellow-400 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-300 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : 'Execute'}
                    </button>
                    <button 
                        onClick={handleDownload}
                        disabled={!imageAfter || imageAfter === "https://storage.googleapis.com/aai-web-samples/elzahaby-placeholder.png" || isLoading}
                        className="bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        Download
                    </button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-hidden">
                <div className="relative w-full max-w-3xl aspect-square select-none">
                    {isLoading && <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20 rounded-lg"><div className="text-white text-lg">AI is creating...</div></div>}
                    {!imageAfter && !isLoading && <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10 rounded-lg"><div className="text-gray-400 text-lg">Your generated image will appear here</div></div>}

                    {imageAfter && <img src={imageAfter} alt="After" className="absolute inset-0 w-full h-full object-contain rounded-lg shadow-2xl" />}
                    
                    {imageBefore && imageAfter && (
                        <>
                            <div
                                className="absolute inset-0 w-full h-full object-contain overflow-hidden rounded-lg"
                                style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                            >
                                <img src={imageBefore} alt="Before" className="absolute inset-0 w-full h-full object-contain" />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10"
                            />
                            <div
                                className="absolute top-0 bottom-0 bg-yellow-400 w-1 pointer-events-none"
                                style={{ left: `calc(${sliderValue}% - 2px)` }}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-yellow-400 w-10 h-10 rounded-full border-4 border-gray-900 flex items-center justify-center text-gray-900">
                                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageTools;