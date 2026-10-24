/**
 * Paints a shareable round card onto a canvas and hands it to the device's
 * share sheet (or downloads it when sharing files is not available).
 */
import { formatRelativeToPar } from '@/lib/golfData';
import { formatHandicap } from '@/lib/handicap';

const W = 1080;
const H = 1350;
const PAD = 76;
const COLORS = {
  bg: '#0c1018',
  panel: '#131c27',
  line: '#22303f',
  text: '#ffffff',
  muted: '#9ea5b3',
  green: '#21c45d',
};

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawCard(ctx, { courseName, date, stats, strokes, handicap }) {
  const font = (weight, size) => `${weight} ${size}px Inter, system-ui, -apple-system, sans-serif`;
  const total = strokes?.reduce((sum, value) => sum + value, 0) ?? 0;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, 48);
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Brand line
  ctx.fillStyle = COLORS.green;
  ctx.beginPath();
  ctx.arc(PAD + 60, PAD + 74, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(700, 24);
  ctx.letterSpacing = '4px';
  ctx.fillText('APEX GOLF AI', PAD + 88, PAD + 82);
  ctx.letterSpacing = '0px';

  // Course + date
  ctx.fillStyle = COLORS.text;
  ctx.font = font(800, 62);
  ctx.fillText(fitText(ctx, courseName ?? 'My round', W - PAD * 2 - 120), PAD + 60, PAD + 210);
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(500, 28);
  ctx.fillText(
    `${new Date(date ?? Date.now()).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })} • ${stats.holes} holes`,
    PAD + 60,
    PAD + 258,
  );

  // Score block
  ctx.fillStyle = COLORS.text;
  ctx.font = font(900, 210);
  ctx.fillText(String(stats.score ?? 0), PAD + 54, PAD + 470);
  const scoreWidth = ctx.measureText(String(stats.score ?? 0)).width;

  ctx.fillStyle = COLORS.green;
  roundRect(ctx, PAD + 80 + scoreWidth, PAD + 350, 190, 84, 42);
  ctx.fill();
  ctx.fillStyle = COLORS.bg;
  ctx.font = font(800, 40);
  ctx.textAlign = 'center';
  ctx.fillText(formatRelativeToPar(stats.diff ?? 0), PAD + 175 + scoreWidth, PAD + 406);
  ctx.textAlign = 'left';

  ctx.fillStyle = COLORS.muted;
  ctx.font = font(600, 22);
  ctx.fillText('STROKES', PAD + 60, PAD + 524);

  // Stat tiles
  const tiles = [
    { label: 'PUTTS', value: stats.putts ?? 0 },
    { label: 'FAIRWAYS', value: `${stats.firPct ?? 0}%` },
    { label: 'GREENS', value: `${stats.girPct ?? 0}%` },
    { label: 'PERFORMANCE EST.', value: `${total > 0 ? '+' : ''}${total.toFixed(1)}` },
  ];
  const gap = 20;
  const tileW = (W - PAD * 2 - 120 - gap) / 2;
  const tileH = 150;

  tiles.forEach((tile, index) => {
    const x = PAD + 60 + (index % 2) * (tileW + gap);
    const y = PAD + 566 + Math.floor(index / 2) * (tileH + gap);
    ctx.fillStyle = '#0f1822';
    roundRect(ctx, x, y, tileW, tileH, 28);
    ctx.fill();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(700, 20);
    ctx.letterSpacing = '2px';
    ctx.fillText(tile.label, x + 30, y + 52);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = COLORS.text;
    ctx.font = font(800, 54);
    ctx.fillText(String(tile.value), x + 30, y + 116);
  });

  // Handicap line
  if (handicap !== null && handicap !== undefined) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(500, 26);
    ctx.fillText('Unofficial handicap estimate', PAD + 60, PAD + 1040);
    ctx.fillStyle = COLORS.green;
    ctx.font = font(800, 26);
    ctx.fillText(formatHandicap(handicap), PAD + 300, PAD + 1040);
  }

  // Footer
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD + 60, H - PAD - 120);
  ctx.lineTo(W - PAD - 60, H - PAD - 120);
  ctx.stroke();

  ctx.fillStyle = COLORS.muted;
  ctx.font = font(500, 24);
  ctx.fillText('Rangefinder • Plays-like yardage • Performance estimates', PAD + 60, H - PAD - 70);
}

export async function shareRoundCard(payload, filename = 'apex-round.png') {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  drawCard(canvas.getContext('2d'), payload);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;

  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: payload.courseName ?? 'My round' });
      return true;
    } catch {
      /* the golfer dismissed the sheet — fall through to a download */
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}