// chime.js - Simple chime sound generator using Web Audio API

function createChime() {
    // Play the chime.mp3 file
    const audio = new Audio(chrome.runtime.getURL('chime.mp3'));
    audio.volume = 0.3; // Adjust volume as needed
    audio.play().catch(error => {
        console.error('Failed to play chime sound:', error);
        // Fallback to synthesized sound if mp3 fails
        createSynthesizedChime();
    });
}

function createSynthesizedChime() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.2; // Softer volume
    
    // Create a warm, macOS-like chime sound with lower frequencies
    const frequencies = [349.23, 440.00, 523.25]; // F4, A4, C5 (F major chord - warmer than C major)
    
    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Add subtle low-pass filtering for warmth
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000; // Gentle high-frequency rolloff
        filter.Q.value = 0.5;
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'triangle'; // Warmer than sine, softer than sawtooth
        
        // Create a gentle, slower envelope like macOS sounds
        const now = audioContext.currentTime;
        const startTime = now + index * 0.15; // Slightly more spacing
        const endTime = startTime + 2.0; // Longer sustain
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.2); // Slower attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
    });
}

function createCrashSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = 0.2; // Quieter volume for crash
    
    // Create a gentle crash sound using filtered noise and low frequencies
    const now = audioContext.currentTime;
    const duration = 0.8;
    
    // Create noise buffer
    const bufferSize = audioContext.sampleRate * duration;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Generate filtered noise (pink noise approximation)
    for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    
    // Create noise source
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Create low-pass filter for gentle crash effect
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; // Low frequency cutoff
    filter.Q.value = 1;
    
    // Create gain envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Connect the chain
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);
    
    // Add a subtle low-frequency thump
    const thumpOsc = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();
    thumpOsc.frequency.value = 60; // Low frequency
    thumpOsc.type = 'sine';
    
    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    thumpOsc.connect(thumpGain);
    thumpGain.connect(masterGain);
    
    // Start both sounds
    noiseSource.start(now);
    noiseSource.stop(now + duration);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.4);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createChime, createCrashSound };
}