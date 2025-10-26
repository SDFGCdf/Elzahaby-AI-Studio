import React from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Volume2, Mic } from 'lucide-react';

export interface VoiceConfig {
  voiceGender: 'male' | 'female';
  voiceName: string;
  speechRate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  language: string;
}

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: VoiceConfig;
  onConfigChange: (config: VoiceConfig) => void;
}

const maleVoices = [
  { name: 'Puck', label: 'Puck (افتراضي - ذكر)' },
  { name: 'Kore', label: 'Kore (ذكر)' },
  { name: 'Charon', label: 'Charon (ذكر)' },
];

const femaleVoices = [
  { name: 'Aoede', label: 'Aoede (أنثى)' },
  { name: 'Puck', label: 'Puck (أنثى)' },
  { name: 'Fenrir', label: 'Fenrir (أنثى)' },
];

const languages = [
  { code: 'ar-EG', label: 'العربية المصرية (افتراضي)' },
  { code: 'ar-SA', label: 'العربية السعودية' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
];

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ isOpen, onClose, config, onConfigChange }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof VoiceConfig, value: any) => {
    const newConfig = { ...config, [key]: value };

    if (key === 'voiceGender') {
      const defaultVoice = value === 'male' ? 'Puck' : 'Aoede';
      newConfig.voiceName = defaultVoice;
    }

    onConfigChange(newConfig);
  };

  const currentVoices = config.voiceGender === 'male' ? maleVoices : femaleVoices;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="text-yellow-400" size={24} />
            <h2 className="text-xl font-bold text-gray-100">إعدادات المساعد الصوتي</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              <Volume2 size={16} className="inline mr-2" />
              نوع الصوت
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange('voiceGender', 'male')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  config.voiceGender === 'male'
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">ذكر</div>
                <div className="text-xs mt-1 opacity-75">Male</div>
              </button>
              <button
                onClick={() => handleChange('voiceGender', 'female')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  config.voiceGender === 'female'
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">أنثى</div>
                <div className="text-xs mt-1 opacity-75">Female</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              الصوت المحدد
            </label>
            <select
              value={config.voiceName}
              onChange={(e) => handleChange('voiceName', e.target.value)}
              className="w-full bg-gray-700 text-gray-100 rounded-lg p-3 border border-gray-600 focus:border-yellow-400 focus:outline-none transition-colors"
            >
              {currentVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              <Mic size={16} className="inline mr-2" />
              لغة التعرف الصوتي
            </label>
            <select
              value={config.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full bg-gray-700 text-gray-100 rounded-lg p-3 border border-gray-600 focus:border-yellow-400 focus:outline-none transition-colors"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              سرعة الصوت: {config.speechRate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.speechRate}
              onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>بطيء</span>
              <span>عادي</span>
              <span>سريع</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              درجة الصوت: {config.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.pitch}
              onChange={(e) => handleChange('pitch', parseFloat(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>منخفض</span>
              <span>عادي</span>
              <span>عالي</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              مستوى الصوت: {Math.round(config.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.volume}
              onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
              className="w-full accent-yellow-400"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
            <div>
              <div className="font-semibold text-gray-200">الرد الصوتي التلقائي</div>
              <div className="text-xs text-gray-400 mt-1">تفعيل الرد الصوتي تلقائياً لكل رسالة</div>
            </div>
            <button
              onClick={() => handleChange('autoSpeak', !config.autoSpeak)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.autoSpeak ? 'bg-yellow-400' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                animate={{ left: config.autoSpeak ? 28 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4">
          <button
            onClick={onClose}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-colors"
          >
            حفظ الإعدادات
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VoiceSettings;
