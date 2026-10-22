const TASKS_VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const CONNECTIONS = [
  [0, 11],
  [0, 12],
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

const JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

let modelPromise = null;

/**
 * Loads the on-device pose model once per session. Everything runs locally —
 * no frames are uploaded anywhere.
 */
export function loadPoseLandmarker() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const vision = await import(/* @vite-ignore */ `${CDN}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      return vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    })();
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

/** Paints the camera frame and the tracked skeleton into one canvas, cropped to fill. */
export function drawPoseFrame(canvas, video, landmarks, mirror, metrics) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!width || !height || !videoWidth || !videoHeight) return;

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

  if (landmarks) {
    const project = (point) => ({
      x: offsetX + point.x * drawWidth,
      y: offsetY + point.y * drawHeight,
    });

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#39ff14';
    ctx.shadowColor = 'rgba(57, 255, 20, 0.55)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (const [from, to] of CONNECTIONS) {
      const a = project(landmarks[from]);
      const b = project(landmarks[to]);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    for (const index of JOINTS) {
      const point = project(landmarks[index]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  drawAngleHud(ctx, metrics, width, height);
}

/** Angle readout burned into the frame, so saved clips carry the same numbers. */
function drawAngleHud(ctx, metrics, width, height) {
  if (!metrics) return;

  const items = [
    { label: 'SPINE', value: `${metrics.spine}°` },
    { label: 'SHOULDER', value: `${metrics.shoulder}°` },
    { label: 'HIPS', value: `${metrics.hip}°` },
  ];

  const panelWidth = Math.min(width - 20, 216);
  const panelHeight = 38;
  const x = 10;
  const y = height - panelHeight - 10;

  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, panelWidth, panelHeight, 10);
  else ctx.rect(x, y, panelWidth, panelHeight);
  ctx.fillStyle = 'rgba(8, 13, 22, 0.74)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const cellWidth = panelWidth / items.length;
  ctx.textAlign = 'center';
  items.forEach((item, index) => {
    const centerX = x + cellWidth * index + cellWidth / 2;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.95)';
    ctx.font = '600 8px Inter, Arial, sans-serif';
    ctx.fillText(item.label, centerX, y + 14);
    ctx.fillStyle = '#39ff14';
    ctx.font = '800 14px Inter, Arial, sans-serif';
    ctx.fillText(item.value, centerX, y + 30);
  });
  ctx.restore();
}