import { useEffect, useRef } from 'react';
import { useCheckersStore } from '../stores/useCheckersStore';

export const useSound = (soundSrc: string, options: {
  volume?: number;
  loop?: boolean;
}) => {
  const { volume = 1, loop = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundEnabled = useCheckersStore(state => state.settings.soundEnabled);
  
  useEffect(() => {
    const audio = new Audio(soundSrc);
    audio.volume = volume;
    audio.loop = loop;
    
    audioRef.current = audio;
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [soundSrc, volume, loop]);
  
  const play = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log("Unable to play audio:", err);
      });
    }
  };
  
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  const setVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  };
  
  return { play, stop, pause, setVolume };
};

export default useSound;
