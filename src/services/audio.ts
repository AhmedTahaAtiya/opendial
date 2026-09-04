/**
 * Web Audio API synthesizer for timer alarms and alerts
 * Zero external mp3 dependencies, runs purely in-browser.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAlarmChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Harmonic pleasant chime sequence: E5 -> G#5 -> B5 -> E6
    const notes = [659.25, 830.61, 987.77, 1318.51];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.14);

      gain.gain.setValueAtTime(0, now + index * 0.14);
      gain.gain.linearRampToValueAtTime(0.25, now + index * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.14 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.14);
      osc.stop(now + index * 0.14 + 0.5);
    });
  } catch (e) {
    console.warn('Audio chime failed:', e);
  }
}
