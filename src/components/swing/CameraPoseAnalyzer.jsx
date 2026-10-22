import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera, VideoOff } from 'lucide-react';
import BeatFlash from '@/components/swing/BeatFlash';
import PoseMetrics from '@/components/swing/PoseMetrics';
import RecordButton from '@/components/swing/RecordButton';
import { useCanvasRecorder } from '@/hooks/useCanvasRecorder';
import { useGolf } from '@/lib/GolfContext';
import { computePoseMetrics } from '@/lib/poseMetrics';
import { drawPoseFrame, loadPoseLandmarker } from '@/lib/poseTracker';
import { saveSwingVideo } from '@/lib/swingVideos';

const MESSAGES = {
  permission: 'Camera access was blocked. Allow the camera for this site, then try again.',
  insecure: 'The camera needs an https connection. Open the published app to track a swing.',
  missing: 'No camera is available on this device.',
  model: 'The pose engine could not load. Check your connection and try again.',
};

function describeError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return MESSAGES.permission;
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return MESSAGES.missing;
  return MESSAGES.model;
}

export default function CameraPoseAnalyzer() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(-1);
  const lastMetricsRef = useRef('');
  const peakShoulderRef = useRef(0);
  const recordingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState('environment');
  const [metrics, setMetrics] = useState(null);

  const { setLastSwing } = useGolf();

  const handleRecorded = useCallback(
    async (blob, durationMs) => {
      if (!blob || !blob.size) return;
      await saveSwingVideo({
        blob,
        mimeType: blob.type,
        durationMs,
        peakShoulder: peakShoulderRef.current,
      });
      setLastSwing({ peakShoulder: peakShoulderRef.current, date: new Date().toISOString() });
      window.dispatchEvent(new Event('apex-swing-video'));
    },
    [setLastSwing],
  );

  const {
    recording,
    elapsed,
    start: startRecording,
    stop: stopRecording,
  } = useCanvasRecorder(canvasRef, handleRecorded);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const stopCamera = useCallback(async () => {
    if (recordingRef.current) await stopRecording();
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    lastTimeRef.current = -1;
    lastMetricsRef.current = '';
    setMetrics(null);
    setStatus('idle');
  }, [stopRecording]);

  const start = useCallback(async (mode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError(MESSAGES.insecure);
      return;
    }
    setError('');
    setStatus('loading');
    try {
      const landmarker = landmarkerRef.current ?? (await loadPoseLandmarker());
      landmarkerRef.current = landmarker;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setStatus('live');
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus('error');
      setError(describeError(err));
    }
  }, []);

  // Track every frame while the camera is running.
  useEffect(() => {
    if (status !== 'live') return undefined;
    let running = true;

    const tick = () => {
      if (!running) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (video && canvas && landmarker && video.readyState >= 2) {
        if (video.currentTime !== lastTimeRef.current) {
          lastTimeRef.current = video.currentTime;
          const result = landmarker.detectForVideo(video, performance.now());
          const landmarks = result.landmarks?.[0] ?? null;
          const next = computePoseMetrics(landmarks, video.videoWidth / video.videoHeight);
          drawPoseFrame(canvas, video, landmarks, facing === 'user', next);

          if (next && recordingRef.current) {
            peakShoulderRef.current = Math.max(peakShoulderRef.current, next.shoulder);
          }

          const signature = next ? `${next.spine}-${next.shoulder}-${next.hip}` : '';
          if (signature !== lastMetricsRef.current) {
            lastMetricsRef.current = signature;
            setMetrics(next);
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [status, facing]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const switchCamera = () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (status === 'live') {
      stopCamera();
      start(next);
    }
  };

  const handleRecord = () => {
    peakShoulderRef.current = 0;
    startRecording();
  };

  const live = status === 'live';
  const canRecord =
    Boolean(window.MediaRecorder) && typeof HTMLCanvasElement.prototype.captureStream === 'function';

  return (
    <section className="glass-panel rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="hud-label font-bold text-muted-foreground">Live Pose Tracking</span>
          <p className="truncate text-[10px] text-muted-foreground">
            {live
              ? !canRecord
                ? 'This browser cannot record video'
                : metrics
                  ? 'Tracking your swing'
                  : 'Step fully into frame'
              : 'Filmed on this device — video never leaves your phone'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {live && (
            <button
              type="button"
              onClick={switchCamera}
              aria-label="Switch camera"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition hover:text-primary"
            >
              <SwitchCamera className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={live ? stopCamera : () => start(facing)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              live
                ? 'border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25'
                : 'border-primary/40 bg-primary/15 text-primary hover:bg-primary/25'
            }`}
          >
            {live ? <VideoOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            {live ? 'Stop' : status === 'loading' ? 'Starting…' : 'Start'}
          </button>
        </div>
      </div>

      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-border/70 bg-background/80 sm:h-80">
        <canvas ref={canvasRef} className="h-full w-full" />
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />

        {live && <BeatFlash />}

        {live && canRecord && (
          <RecordButton recording={recording} elapsed={elapsed} onStart={handleRecord} onStop={stopRecording} />
        )}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {status === 'loading' ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading the pose engine…</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <Camera className="h-5 w-5" />
                </div>
                <p
                  className={`max-w-xs text-[11px] leading-snug ${
                    error ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {error ||
                    'Prop your phone behind or beside you, then start the camera to track your real swing.'}
                </p>
                <button
                  type="button"
                  onClick={() => start(facing)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-95"
                >
                  {error ? 'Try again' : 'Start camera'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <PoseMetrics metrics={metrics} />
    </section>
  );
}