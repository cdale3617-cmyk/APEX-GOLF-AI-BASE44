interface Window {
  webkitAudioContext?: typeof AudioContext;
  Capacitor?: { isNativePlatform?: () => boolean };
}
interface AudioContext {
  setSinkId?: (sinkId: string) => Promise<void>;
}
