import { useCallback, useRef } from 'react';

const useSound = (soundUrl: string, volume = 0.5) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use a stable ref to the audio element to avoid re-creating it
  if (!audioRef.current) {
      // Find preloaded audio element from index.html
      const audioId = soundUrl.split('/').pop()?.split('.')[0];
      if (audioId) {
        audioRef.current = document.getElementById(audioId) as HTMLAudioElement;
      }
  }

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.currentTime = 0; // Rewind to start
      audioRef.current.play().catch(error => {
        // Autoplay policy might prevent playing without user interaction.
        // This is fine for UI sounds which are always triggered by user actions.
        console.warn(`Sound playback failed for ${soundUrl}:`, error);
      });
    }
  }, [volume, soundUrl]);

  return play;
};

export default useSound;