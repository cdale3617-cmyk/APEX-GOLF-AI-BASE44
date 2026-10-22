import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 20;
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/**
 * Records the overlay canvas itself, so the skeleton and angles are burned
 * into the saved clip.
 */
export function useCanvasRecorder(canvasRef, onRecorded) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const finish = useCallback(() => {
    clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    const durationMs = startedRef.current ? Date.now() - startedRef.current : 0;
    startedRef.current = 0;
    recorderRef.current = null;
    setRecording(false);
    if (!recorder) return;
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
    chunksRef.current = [];
    onRecordedRef.current?.(blob, durationMs);
  }, []);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.MediaRecorder || typeof canvas.captureStream !== 'function') return;
    const stream = canvas.captureStream(30);
    const mimeType = MIME_CANDIDATES.find((type) => window.MediaRecorder.isTypeSupported(type));
    const recorder = new window.MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 4000000 } : undefined,
    );

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      finish();
    };

    recorderRef.current = recorder;
    startedRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
    recorder.start(200);

    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS && recorder.state !== 'inactive') recorder.stop();
    }, 200);
  }, [canvasRef, finish]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    await new Promise((resolve) => {
      const previous = recorder.onstop;
      recorder.onstop = (event) => {
        previous?.(event);
        resolve();
      };
      recorder.stop();
    });
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { recording, elapsed, start, stop };
}