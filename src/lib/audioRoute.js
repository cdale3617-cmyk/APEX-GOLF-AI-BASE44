/**
 * Caddie audio routing.
 *
 * Browsers send speech synthesis to whatever audio route is active. Keeping a
 * near-silent looping clip playing on the chosen output pins that route to the
 * golfer's earbuds, so the caddie speaks there instead of the phone speaker.
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