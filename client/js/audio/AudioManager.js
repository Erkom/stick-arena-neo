// Audio Manager for handling game sounds
class AudioManager {
  constructor() {
    this.sounds = {};
    this.muted = false;
    this.loadedSounds = 0;
    this.totalSounds = 0;
    this.isReady = false;
    this.onReadyCallback = null;
  }

  // Load all game sounds
  loadSounds() {
    const soundFiles = {
      // UI sounds
      'ui-click': 'sounds/ui-click.mp3',
      'ui-hover': 'sounds/ui-hover.mp3',
      
      // Weapon sounds
      'glock-shot': 'sounds/weapons/glock-shot.mp3',
      'bat-swing': 'sounds/weapons/bat-swing.mp3',
      'ak47-shot': 'sounds/weapons/ak47-shot.mp3',
      'shotgun-shot': 'sounds/weapons/shotgun-shot.mp3',
      'hammer-swing': 'sounds/weapons/hammer-swing.mp3',
      
      // Player sounds
      'player-hit': 'sounds/player/hit.mp3',
      'player-death': 'sounds/player/death.mp3',
      'player-respawn': 'sounds/player/respawn.mp3',
      
      // Game sounds
      'game-start': 'sounds/game-start.mp3',
      'game-end': 'sounds/game-end.mp3',
      'countdown': 'sounds/countdown.mp3'
    };
    
    this.totalSounds = Object.keys(soundFiles).length;
    
    // Load each sound
    for (const [name, path] of Object.entries(soundFiles)) {
      this.loadSound(name, path);
    }
  }
  
  // Set a callback for when all sounds are loaded
  setOnReadyCallback(callback) {
    this.onReadyCallback = callback;
    if (this.isReady && this.onReadyCallback) {
      this.onReadyCallback();
    }
  }
  
  // Load an individual sound
  loadSound(name, path) {
    const sound = new Audio();
    sound.src = path;
    
    // Handle loading errors gracefully
    sound.onerror = () => {
      console.warn(`Failed to load sound: ${name} (${path})`);
      this.loadedSounds++;
      this.checkIfReady();
    };
    
    sound.oncanplaythrough = () => {
      this.loadedSounds++;
      this.checkIfReady();
    };
    
    this.sounds[name] = sound;
  }
  
  // Check if all sounds are loaded
  checkIfReady() {
    if (this.loadedSounds >= this.totalSounds) {
      this.isReady = true;
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    }
  }
  
  // Play a sound
  play(name, volume = 1.0, loop = false) {
    if (this.muted || !this.sounds[name]) return;
    
    // Clone the audio to allow overlapping sounds
    const sound = this.sounds[name].cloneNode();
    sound.volume = volume;
    sound.loop = loop;
    sound.play();
    
    return sound;
  }
  
  // Stop a specific sound
  stop(sound) {
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  // Set whether sounds are muted
  setMuted(muted) {
    this.muted = muted;
  }
  
  // Toggle mute state
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

// Create a global audio manager instance
window.audioManager = new AudioManager();