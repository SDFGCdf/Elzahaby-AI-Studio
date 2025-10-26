
import React, { useState, useCallback, useEffect } from 'react';
import { Feature } from './types';
import { DashboardIcon, ImageIcon, SparkleIcon, AudioIcon, CodeIcon, UserCircleIcon } from './components/icons';
import Dashboard from './components/features/Dashboard';
import ImageTools from './components/features/ImageTools';
import ElzahabyAssistant from './components/features/ElzahabyAssistant';
import AudioTools from './components/features/AudioTools';
import ElzahabyCodePro from './components/features/AppGenerator';
import ContactDeveloper from './components/ContactDeveloper';
import useMediaQuery from './hooks/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';

// FIX: Cast motion components to `any` to bypass TypeScript errors.
const MotionButton = motion.button as any;
const MotionDiv = motion.div as any;

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const navItems = [
  { feature: Feature.Dashboard, icon: DashboardIcon },
  { feature: Feature.ElzahabyAssistant, icon: SparkleIcon },
  { feature: Feature.ImageTools, icon: ImageIcon },
  { feature: Feature.AudioTools, icon: AudioIcon },
  { feature: Feature.AppGenerator, icon: CodeIcon },
];

const App: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<Feature>(Feature.Dashboard);
  
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const renderFeatureComponent = (feature: Feature) => {
    switch (feature) {
      case Feature.Dashboard:
        return <Dashboard setActiveFeature={setActiveFeature} />;
      case Feature.ImageTools:
        return <ImageTools />;
      case Feature.ElzahabyAssistant:
        return <ElzahabyAssistant />;
      case Feature.AudioTools:
        return <AudioTools />;
      case Feature.AppGenerator:
        return <ElzahabyCodePro />;
      default:
        return <Dashboard setActiveFeature={setActiveFeature} />;
    }
  };

  // --- Layout Renderers ---
  const renderDesktopLayout = () => (
     <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
        <aside className="w-16 bg-gray-900 border-r border-gray-800 p-2 flex flex-col items-center flex-shrink-0 shadow-lg">
          <div className="w-10 h-10 mb-8 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg text-gray-900 font-bold text-2xl shadow-md">E</div>
          <nav className="flex flex-col space-y-3 flex-grow w-full">
            {navItems.map(({ feature, icon: Icon }) => (
              <MotionButton
                key={feature}
                onClick={() => setActiveFeature(feature)}
                className={`w-full h-12 p-1 flex items-center justify-center rounded-lg relative transition-colors duration-200 ${activeFeature === feature ? 'text-yellow-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                title={feature}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {activeFeature === feature && (
                  <MotionDiv layoutId="desktop-active-pill" className="absolute inset-0 bg-yellow-400/10 rounded-lg border-l-2 border-yellow-400" />
                )}
                <Icon className="w-6 h-6 z-10" />
              </MotionButton>
            ))}
          </nav>
          <MotionButton
            onClick={() => setIsContactModalOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-12 p-1 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700/50 transition-colors duration-200 mt-auto"
            title="Contact Developer"
          >
            <UserCircleIcon className="w-6 h-6" />
          </MotionButton>
        </aside>
        <main className="flex-1 min-h-0 min-w-0">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeFeature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              {renderFeatureComponent(activeFeature)}
            </MotionDiv>
          </AnimatePresence>
         </main>
      </div>
  );

  const renderTabletLayout = () => (
     <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col flex-shrink-0 shadow-xl">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl text-gray-900 font-bold text-3xl shadow-lg">E</div>
            <span className="font-bold text-lg text-gray-100 whitespace-nowrap">Elzahaby AI Studio</span>
          </div>
          <nav className="flex flex-col space-y-2 flex-grow">
            {navItems.map(({ feature, icon: Icon }) => (
              <MotionButton
                key={feature}
                onClick={() => setActiveFeature(feature)}
                className={`w-full flex items-center space-x-4 p-3 rounded-lg text-left relative transition-colors duration-200 ${activeFeature === feature ? 'text-yellow-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                 {activeFeature === feature && (
                  <MotionDiv layoutId="tablet-active-pill" className="absolute inset-0 bg-yellow-400/10 rounded-lg" />
                )}
                <Icon className="w-6 h-6 flex-shrink-0 z-10" />
                <span className="font-semibold z-10">{feature}</span>
              </MotionButton>
            ))}
          </nav>
          <MotionButton
            onClick={() => setIsContactModalOpen(true)}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center space-x-4 p-3 rounded-lg text-gray-300 hover:bg-gray-700/50 transition-colors duration-200"
          >
            <UserCircleIcon className="w-6 h-6" />
            <span className="font-semibold">Contact</span>
          </MotionButton>
        </aside>
        <main className="flex-1 min-h-0 min-w-0">
           <AnimatePresence mode="wait">
            <MotionDiv
              key={activeFeature}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              {renderFeatureComponent(activeFeature)}
            </MotionDiv>
          </AnimatePresence>
         </main>
      </div>
  );

  const renderMobileLayout = () => (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
        <main className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
              <MotionDiv
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                {renderFeatureComponent(activeFeature)}
              </MotionDiv>
          </AnimatePresence>
        </main>
        <nav className="flex-shrink-0 grid grid-cols-5 gap-1 p-2 bg-gray-900 border-t border-gray-800 shadow-2xl">
            {navItems.map(({ feature, icon: Icon }) => (
              <MotionButton
                key={feature}
                onClick={() => setActiveFeature(feature)}
                className="flex flex-col items-center justify-center p-2 rounded-lg relative"
                whileTap={{ scale: 0.9 }}
              >
                 {activeFeature === feature && (
                  <MotionDiv 
                    layoutId="mobile-active-pill" 
                    className="absolute inset-0 bg-yellow-400/10 rounded-lg" 
                    style={{ borderRadius: 8 }}
                  />
                )}
                <Icon className={`w-6 h-6 mb-1 z-10 transition-colors ${activeFeature === feature ? 'text-yellow-300' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium z-10 transition-colors ${activeFeature === feature ? 'text-yellow-300' : 'text-gray-500'}`}>{feature.split(' ')[0]}</span>
              </MotionButton>
            ))}
        </nav>
    </div>
  );
  
  const renderLayout = () => {
    switch(deviceType) {
      case 'desktop':
        return renderDesktopLayout();
      case 'tablet':
        return renderTabletLayout();
      case 'mobile':
        return renderMobileLayout();
    }
  }

  return (
    <>
      {renderLayout()}
      <AnimatePresence>
        {isContactModalOpen && (
           <MotionDiv
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
           >
            <ContactDeveloper 
              isOpen={isContactModalOpen}
              onClose={() => setIsContactModalOpen(false)}
            />
          </MotionDiv>
        )}
      </AnimatePresence>
       <style>{`
          /* Custom scrollbar for a more integrated look */
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #1f2937; }
          ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #6b7280; }

          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          @keyframes pulse-fast { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.9); opacity: 0.7; } }
          @keyframes pulse-medium { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.9); opacity: 0.7; } }
          @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.9); opacity: 0.7; } }
          .animate-pulse-fast { animation: pulse-fast 1.2s infinite ease-in-out; }
          .animate-pulse-medium { animation: pulse-medium 1.2s 0.2s infinite ease-in-out; }
          .animate-pulse-slow { animation: pulse-slow 1.2s 0.4s infinite ease-in-out; }
        `}</style>
    </>
  );
};

export default App;