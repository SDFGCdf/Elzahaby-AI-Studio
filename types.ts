import React from 'react';

export enum Feature {
  Dashboard = 'Dashboard',
  ImageTools = 'Image Tools',
  ElzahabyAssistant = 'Elzahaby Assistant',
  AudioTools = 'Audio Tools',
  AppGenerator = 'Elzahaby Code Pro',
}

export interface NavItem {
  feature: Feature;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  image?: string; // for user upload or AI generation
  code?: {
    language: string;
    content: string;
  };
  suggestions?: string[];
  sources?: { uri: string; title: string }[]; // for search grounding
  isSpeaking?: boolean; // for TTS
}

export interface WindowConfig {
  id: string;
  feature: Feature;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}