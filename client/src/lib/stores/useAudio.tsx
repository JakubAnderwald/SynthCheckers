import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  isMuted: false, // Start with sound enabled
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  toggleMute: () => {
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    
    // Update the muted state
    set({ isMuted: newMutedState });
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
    
    // Handle background music
    if (backgroundMusic) {
      if (newMutedState) {
        // Pause the music if we're muting
        backgroundMusic.pause();
        console.log("Background music paused due to mute");
      } else {
        // Resume the music if we're unmuting
        // Note: We'll let the game store handle when to actually play
        console.log("Sound unmuted, music can be resumed");
      }
    }
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }
      
      console.log("Playing hit sound effect");
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.6; // Increased volume
      soundClone.currentTime = 0; // Reset to beginning
      soundClone.play().catch(error => {
        console.log("Hit sound play prevented:", error);
        
        // Try a second time with a slight delay (browser restrictions sometimes require user interaction)
        setTimeout(() => {
          soundClone.play().catch(err => {
            console.log("Second attempt to play hit sound failed:", err);
          });
        }, 100);
      });
    } else {
      console.log("Hit sound not loaded yet");
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Success sound skipped (muted)");
        return;
      }
      
      console.log("Playing success sound effect");
      // Clone the sound to allow overlapping playback
      const soundClone = successSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.8; // Keep volume high for success sound
      soundClone.currentTime = 0; // Reset to beginning
      soundClone.play().catch(error => {
        console.log("Success sound play prevented:", error);
        
        // Try a second time with a slight delay (browser restrictions sometimes require user interaction)
        setTimeout(() => {
          soundClone.play().catch(err => {
            console.log("Second attempt to play success sound failed:", err);
          });
        }, 100);
      });
    } else {
      console.log("Success sound not loaded yet");
    }
  }
}));
