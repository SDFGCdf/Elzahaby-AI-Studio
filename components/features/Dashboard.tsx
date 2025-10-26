
import React from 'react';
import { Feature } from '../../types';
import { ImageIcon, SparkleIcon, AudioIcon, CodeIcon } from '../icons';
import { motion } from 'framer-motion';

// FIX: Cast motion components to `any` to bypass TypeScript errors.
const MotionDiv = motion.div as any;

interface DashboardProps {
  setActiveFeature: (feature: Feature) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
};

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; custom: number; }> = ({ title, description, icon: Icon, onClick, custom }) => {
  return (
    <MotionDiv
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={custom}
      whileHover={{ scale: 1.03, y: -5 }}
      className="relative"
    >
      <button
        onClick={onClick}
        className="bg-gray-800/50 hover:bg-gray-800 p-6 rounded-xl border border-gray-700/50 hover:border-yellow-400/50 transition-all duration-300 text-left w-full h-full flex flex-col overflow-hidden"
      >
        <MotionDiv
          className="absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(400px at 50% 0%, rgba(250, 204, 21, 0.1), transparent 80%)',
          }}
          whileHover={{ opacity: 1 }}
        />
        <div className="flex-shrink-0 w-12 h-12 bg-gray-700/80 rounded-lg flex items-center justify-center mb-4 z-10">
          <Icon className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="flex-grow z-10">
          <h3 className="font-bold text-lg text-gray-100 mb-2">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </button>
    </MotionDiv>
  );
};


const Dashboard: React.FC<DashboardProps> = ({ setActiveFeature }) => {
  const features = [
    {
      feature: Feature.ElzahabyAssistant,
      title: "Elzahaby Assistant",
      description: "Engage in a multi-modal conversation to generate code, text, ideas, and more.",
      icon: SparkleIcon
    },
    {
      feature: Feature.ImageTools,
      title: "Image Tools",
      description: "Generate, edit, and upscale images with a suite of professional AI tools.",
      icon: ImageIcon
    },
    {
      feature: Feature.AudioTools,
      title: "Audio Tools",
      description: "Transform text into natural-sounding speech with a rich library of cloud voices.",
      icon: AudioIcon
    },
    {
      feature: Feature.AppGenerator,
      title: "Elzahaby Code Pro",
      description: "Describe your application and watch as the AI builds it for you in real-time.",
      icon: CodeIcon
    }
  ];

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <MotionDiv 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl mx-auto mb-12"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
          Elzahaby AI Studio
        </h1>
        <p className="mt-4 text-md sm:text-lg text-gray-400">
          Your unified creative suite, powered by next-generation AI. From photorealistic images to full-stack applications, bring your vision to life.
        </p>
      </MotionDiv>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {features.map((item, index) => (
           <FeatureCard
             key={item.feature}
             title={item.title}
             description={item.description}
             icon={item.icon}
             onClick={() => setActiveFeature(item.feature)}
             custom={index}
           />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;