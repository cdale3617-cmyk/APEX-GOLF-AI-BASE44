/**
 * Caddie audio routing.
 *
 * Browser speech synthesis follows Android's active media audio route; the
 * WebView cannot pair Bluetooth devices or select the speech synthesizer sink.
 * A separate tone can check whether the selected output actually plays.
 */

const SILENT_CLIP =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

let keepAlive = null;

export const canPickOutput = () =>
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

export function hasOutputs() {
  return Boolean(navigator.mediaDevices?.enumerateDevices);
}

export async function listOutputs() {
  if (!hasOutputs()) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'audiooutput');
}

function holdElement() {
  if (!keepAlive) {
    keepAlive = new Audio(SILENT_CLIP);
    keepAlive.loop = true;
    keepAlive.setAttribute('playsinline', '');
    // Faint enough to be inaudible, real enough to keep the route open.
    keepAlive.volume = 0.001;
  }
  return keepAlive;
}

/** Points playback at the chosen earbuds and keeps it alive. */
export async function routeAudio(deviceId) {
  const audio = holdElement();
  if (canPickOutput() && deviceId) {
    try {
      await audio.setSinkId(deviceId);
    } catch {
      /* the system route stays in charge */
    }
  }
  if (audio.paused) {
    try {
      await audio.play();
    } catch {
      /* the browser needs a tap first — the next spoken line retries */
    }
  }
  return audio;
}

/** Audible two-note test started directly by a user tap (not speech synthesis). */
export async function testAudioOutput(deviceId = '') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Sound test is unavailable on this device.');
  const context = new AudioContextClass();
  try {
    if (deviceId && typeof context.setSinkId === 'function') await context.setSinkId(deviceId);
    await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
    gain.gain.setValueAtTime(0.16, context.currentTime + 0.30);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.38);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    await new Promise((resolve) => { oscillator.onended = resolve; });
  } finally {
    await context.close().catch(() => null);
  }
}
