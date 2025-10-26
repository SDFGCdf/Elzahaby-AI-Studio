

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Folder, Plus, RefreshCw, UploadCloud, DownloadCloud, Code, Eye, Terminal, Monitor, Tablet, Smartphone, Search, X, File, ChevronDown, ChevronRight, HardDriveDownload, GitBranch } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import JSZip from 'jszip';
import useSound from '../../hooks/useSound';
// Import ElzahabyAssistant component to be used in the layout.
import ElzahabyAssistant from './ElzahabyAssistant';
// FIX: Import useMediaQuery hook to determine device type for responsive layout.
import useMediaQuery from '../../hooks/useMediaQuery';

// FIX: Add global declaration for Babel which is loaded from a script tag
declare global {
  interface Window {
    Babel: any;
  }
}

// FIX: Cast motion component to `any` to bypass TypeScript errors.
const MotionDiv = motion.div as any;

// --- TYPES ---
interface ProjectFile {
  name: string;
  content: string;
  type: 'file';
}

interface ProjectFolder {
  name: string;
  type: 'folder';
  children: (ProjectFile | ProjectFolder)[];
}

type ProjectItem = ProjectFile | ProjectFolder;
type View = 'code' | 'preview' | 'terminal';
type MobileView = 'assistant' | 'explorer' | 'editor';
type SidePanelView = 'explorer' | 'extensions';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface Extension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  icon?: string;
  configFiles?: { [key: string]: string };
}

// --- MOCK DATA & CONFIG ---
const initialFiles: ProjectItem[] = [
  { name: 'index.html', type: 'file', content: '<h1>Hello, World!</h1>' },
  { name: 'style.css', type: 'file', content: 'body { font-family: sans-serif; }' },
  { name: 'script.js', type: 'file', content: 'console.log("Hello, World!");' },
];

const availableExtensions: Extension[] = [
    { id: 'prettier', name: 'Prettier - Code formatter', publisher: 'Prettier', description: 'Enforces a consistent style by parsing your code and re-printing it.', configFiles: { '.prettierrc': '{ "semi": true, "singleQuote": true }' } },
    { id: 'gitlens', name: 'GitLens — Git supercharged', publisher: 'GitKraken', description: 'Supercharge Git within your editor.'},
    { id: 'copilot', name: 'GitHub Copilot', publisher: 'GitHub', description: 'AI pair programmer that helps you write code faster.'},
    { id: 'es7-react-snippets', name: 'ES7+ React/Redux/React-Native snippets', publisher: 'dsznajder', description: 'Code snippets for React, Redux and GraphQL.'},
    { id: 'tailwind-intellisense', name: 'Tailwind CSS IntelliSense', publisher: 'Tailwind Labs', description: 'Intelligent Tailwind CSS tooling for VS Code.'},
    { id: 'python', name: 'Python', publisher: 'Microsoft', description: 'IntelliSense, linting, debugging, code navigation, code formatting, refactoring, variable explorer, test explorer, and more!'},
];

const deviceDimensions: Record<PreviewDevice, { width: string; height: string }> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};


// --- HOOKS ---
const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
};

// --- MAIN COMPONENT ---
const ElzahabyCodePro: React.FC = () => {
    // State Management
    const [projectFiles, setProjectFiles] = usePersistentState<ProjectItem[]>('elzahaby-codepro-files', initialFiles);
    const [openTabs, setOpenTabs] = usePersistentState<string[]>( 'elzahaby-codepro-opentabs', ['index.html']);
    const [activeTab, setActiveTab] = usePersistentState<string | null>('elzahaby-codepro-activetab','index.html');
    const [installedExtensions, setInstalledExtensions] = usePersistentState<Extension[]>('elzahaby-codepro-extensions', []);
    const [leftPanelVisible, setLeftPanelVisible] = useState(true);
    const [sidePanelView, setSidePanelView] = useState<SidePanelView>('explorer');
    const [mainView, setMainView] = useState<View>('code');
    const [mobileView, setMobileView] = useState<MobileView>('assistant');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewKey, setPreviewKey] = useState(0); // Used to force iframe refresh
    const [isLoading, setIsLoading] = useState(false);

    // Sounds
    const playClick = useSound('https://storage.googleapis.com/aai-web-samples/codepro-sounds/click.mp3', 0.5);
    const playSend = useSound('https://storage.googleapis.com/aai-web-samples/codepro-sounds/send.mp3', 0.5);
    const playOpen = useSound('https://storage.googleapis.com/aai-web-samples/codepro-sounds/open.mp3', 0.5);

    // Find a file in the project tree
    const findFile = (path: string, items: ProjectItem[]): ProjectFile | null => {
        for (const item of items) {
            if (item.type === 'file' && item.name === path) return item;
        }
        return null;
    };
    
    // --- UI Handlers ---
    const handleTabClick = (path: string) => {
        setActiveTab(path);
        playClick();
    };

    const handleFileClick = (path: string) => {
        if (!openTabs.includes(path)) {
            setOpenTabs(prev => [...prev, path]);
            playOpen();
        }
        setActiveTab(path);
        if(isMobile) {
            setMobileView('editor');
        }
    };

    const handleTabClose = (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tabIndex = openTabs.indexOf(path);
        setOpenTabs(prev => prev.filter(p => p !== path));

        if (activeTab === path) {
            if (openTabs.length > 1) {
                setActiveTab(openTabs[tabIndex > 0 ? tabIndex - 1 : 1]);
            } else {
                setActiveTab(null);
            }
        }
        playClick();
    };

    const handleCodeChange = (newValue: string | undefined) => {
        if (activeTab && newValue !== undefined) {
            setProjectFiles(prevFiles => {
                const newFiles = JSON.parse(JSON.stringify(prevFiles));
                const file = findFile(activeTab, newFiles);
                if (file) {
                    file.content = newValue;
                }
                return newFiles;
            });
        }
    };
    
    const isExtensionInstalled = (id: string) => installedExtensions.some(ext => ext.id === id);

    const handleInstallExtension = (ext: Extension) => {
        if (!isExtensionInstalled(ext.id)) {
            setInstalledExtensions(prev => [...prev, ext]);
            playOpen();
        }
    };

    // --- Core Functionality ---
    const generatePreviewContent = useCallback(async () => {
        let finalHtml = findFile('index.html', projectFiles)?.content || '';
        const cssFiles = projectFiles.filter(f => f.name.endsWith('.css')) as ProjectFile[];
        const jsFiles = projectFiles.filter(f => f.name.endsWith('.js') || f.name.endsWith('.jsx') || f.name.endsWith('.ts') || f.name.endsWith('.tsx')) as ProjectFile[];

        // Inject CSS
        const cssContent = cssFiles.map(f => f.content).join('\n');
        finalHtml = finalHtml.replace('</head>', `<style>${cssContent}</style></head>`);
        
        // Prepare and transpile JS/TS
        const transpiledScripts = await Promise.all(
            jsFiles.map(async file => {
                 try {
                     if (file.name.endsWith('.jsx') || file.name.endsWith('.tsx')) {
                         const result = await window.Babel.transform(file.content, {
                             presets: ['react', 'typescript'],
                             filename: file.name
                         });
                         return result.code;
                     }
                      if (file.name.endsWith('.ts')) {
                         const result = await window.Babel.transform(file.content, {
                             presets: ['typescript'],
                             filename: file.name
                         });
                         return result.code;
                     }
                     return file.content;
                 } catch (e: any) {
                     console.error(`Babel Error in ${file.name}:`, e);
                     return `console.error("Babel Error in ${file.name}:", ${JSON.stringify(e.message)});`;
                 }
            })
        );
        
        const scriptContent = transpiledScripts.join('\n\n// --- End of File ---\n\n');
        finalHtml = finalHtml.replace('</body>', `<script type="module">${scriptContent}</script></body>`);
        
        return finalHtml;
    }, [projectFiles]);


    // --- RENDERERS ---
    
    const FileExplorer = () => (
      <div className="p-2 text-gray-300">
        <h3 className="text-sm font-bold tracking-wider uppercase p-2">Explorer</h3>
         {projectFiles.map(item => (
            <div key={item.name} onClick={() => handleFileClick(item.name)} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer text-sm">
                <FileText size={16} />
                <span>{item.name}</span>
            </div>
         ))}
      </div>
    );
    
    const ExtensionsMarketplace = () => (
        <div className="p-2 text-gray-300">
             <h3 className="text-sm font-bold tracking-wider uppercase p-2">Extensions</h3>
             <div className="space-y-2">
                {availableExtensions.map(ext => (
                    <div key={ext.id} className="p-2 rounded-md bg-gray-800/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm">{ext.name}</p>
                                <p className="text-xs text-gray-400">{ext.publisher}</p>
                            </div>
                            <button 
                                onClick={() => handleInstallExtension(ext)} 
                                disabled={isExtensionInstalled(ext.id)}
                                className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-1 px-3 rounded-full transition-colors"
                            >
                                {isExtensionInstalled(ext.id) ? 'Installed' : 'Install'}
                            </button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );

    const isMobile = useMediaQuery('(max-width: 768px)');
    const [previewContent, setPreviewContent] = useState('');

    useEffect(() => {
        const generate = async () => {
            const content = await generatePreviewContent();
            setPreviewContent(content);
        };
        generate();
    }, [projectFiles, generatePreviewContent]);

    const refreshPreview = () => setPreviewKey(prev => prev + 1);

    const activeFile = activeTab ? findFile(activeTab, projectFiles) : null;

    // FIX: Add component return with JSX to fix render error and provide UI. This was missing.
    if (isMobile) {
        return (
            <div className="h-full flex flex-col bg-[#1e1e1e]">
                <div className="flex-grow min-h-0">
                     <AnimatePresence mode="wait">
                        <MotionDiv
                            key={mobileView}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {mobileView === 'assistant' && <ElzahabyAssistant />}
                            {mobileView === 'explorer' && (
                                <div className="p-2 h-full overflow-y-auto">
                                    <FileExplorer />
                                </div>
                            )}
                            {mobileView === 'editor' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex-shrink-0 bg-[#2d2d2d] px-4 py-2 text-sm">{activeTab || "No file selected"}</div>
                                    <div className="flex-grow min-h-0">
                                        <MonacoEditor
                                            height="100%"
                                            language={activeFile?.name.split('.').pop() || 'javascript'}
                                            theme="vs-dark"
                                            value={activeFile?.content || ''}
                                            onChange={handleCodeChange}
                                            options={{ minimap: { enabled: false } }}
                                        />
                                    </div>
                                </div>
                            )}
                        </MotionDiv>
                    </AnimatePresence>
                </div>
                <div className="flex-shrink-0 bg-black/30 border-t border-gray-700/50 flex justify-around p-1">
                    <button onClick={() => setMobileView('assistant')} className={`p-3 rounded-lg ${mobileView === 'assistant' ? 'bg-yellow-400/20 text-yellow-300' : 'text-gray-400'}`}><Terminal size={20}/></button>
                    <button onClick={() => setMobileView('explorer')} className={`p-3 rounded-lg ${mobileView === 'explorer' ? 'bg-yellow-400/20 text-yellow-300' : 'text-gray-400'}`}><Folder size={20}/></button>
                    <button onClick={() => setMobileView('editor')} className={`p-3 rounded-lg ${mobileView === 'editor' ? 'bg-yellow-400/20 text-yellow-300' : 'text-gray-400'}`}><Code size={20}/></button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-full bg-[#1e1e1e]">
             {/* Activity Bar */}
            <div className="w-12 bg-black/20 flex flex-col items-center py-2 space-y-2 flex-shrink-0">
                <button onClick={() => { setSidePanelView('explorer'); setLeftPanelVisible(p => sidePanelView !== 'explorer' ? true : !p); }} className={`p-2 rounded-lg ${sidePanelView === 'explorer' && leftPanelVisible ? 'text-yellow-400' : 'text-gray-400 hover:bg-gray-700/50'}`}><FileText size={24}/></button>
                <button onClick={() => { setSidePanelView('extensions'); setLeftPanelVisible(p => sidePanelView !== 'extensions' ? true : !p); }} className={`p-2 rounded-lg ${sidePanelView === 'extensions' && leftPanelVisible ? 'text-yellow-400' : 'text-gray-400 hover:bg-gray-700/50'}`}><GitBranch size={24}/></button>
            </div>

             <AnimatePresence>
                {leftPanelVisible && (
                    <MotionDiv initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-[#252526] flex-shrink-0 overflow-y-auto">
                        {sidePanelView === 'explorer' ? <FileExplorer /> : <ExtensionsMarketplace />}
                    </MotionDiv>
                )}
            </AnimatePresence>
            
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 min-h-0 grid grid-cols-2">
                    <div className="h-full flex flex-col">
                         <div className="bg-[#252526] flex-shrink-0">
                            <div className="flex">
                                {openTabs.map(path => (
                                    <div key={path} onClick={() => handleTabClick(path)} className={`flex items-center space-x-2 px-4 py-2 text-sm cursor-pointer border-r border-gray-900 ${activeTab === path ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d]'}`}>
                                        <span>{path}</span>
                                        <button onClick={(e) => handleTabClose(path, e)} className="p-0.5 rounded-full hover:bg-gray-600"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-grow min-h-0">
                           <ElzahabyAssistant />
                        </div>
                    </div>
                    <div className="h-full flex flex-col border-l border-gray-700/50">
                        <div className="bg-[#252526] p-2 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setPreviewDevice('desktop')} className={`p-1 rounded ${previewDevice === 'desktop' ? 'text-yellow-400 bg-gray-700' : ''}`}><Monitor size={18}/></button>
                                <button onClick={() => setPreviewDevice('tablet')} className={`p-1 rounded ${previewDevice === 'tablet' ? 'text-yellow-400 bg-gray-700' : ''}`}><Tablet size={18}/></button>
                                <button onClick={() => setPreviewDevice('mobile')} className={`p-1 rounded ${previewDevice === 'mobile' ? 'text-yellow-400 bg-gray-700' : ''}`}><Smartphone size={18}/></button>
                            </div>
                            <button onClick={refreshPreview} className="flex items-center space-x-1 text-sm p-1 rounded hover:bg-gray-700"><RefreshCw size={14}/> Refresh</button>
                        </div>
                        <div className="flex-1 bg-gray-800 flex items-center justify-center p-4 overflow-auto">
                            <div className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300" style={deviceDimensions[previewDevice]}>
                                <iframe
                                    key={previewKey}
                                    srcDoc={previewContent}
                                    title="preview"
                                    sandbox="allow-scripts allow-modals allow-forms"
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Add default export for component
export default ElzahabyCodePro;
