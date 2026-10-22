const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const toDegrees = (radians) => (radians * 180) / Math.PI;
const MIN_VISIBILITY = 0.45;

/**
 * Real angles measured from the landmarks the pose model returns.
 * x/y are normalised image coordinates; z is depth relative to the hips.
 */
export function computePoseMetrics(landmarks, aspect) {
  if (!landmarks || landmarks.length < 25) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const core = [leftShoulder, rightShoulder, leftHip, rightHip];
  if (core.some((point) => (point?.visibility ?? 0) < MIN_VISIBILITY)) return null;

  const shoulders = midpoint(leftShoulder, rightShoulder);
  const hips = midpoint(leftHip, rightHip);

  // Torso lean away from vertical, in the plane the camera sees.
  const spineDx = (shoulders.x - hips.x) * aspect;
  const spineDy = Math.max(hips.y - shoulders.y, 0.002);
  const spine = Math.abs(toDegrees(Math.atan2(spineDx, spineDy)));

  // How far a segment has turned through the depth axis, away from square to the lens.
  const turn = (right, left) =>
    Math.abs(toDegrees(Math.atan2(right.z - left.z, (right.x - left.x) * aspect)));

  const shoulder = turn(rightShoulder, leftShoulder);
  const hip = turn(rightHip, leftHip);

  return {
    spine: Math.round(Math.min(spine, 90)),
    shoulder: Math.round(Math.min(shoulder, 90)),
    hip: Math.round(Math.min(hip, 90)),
    separation: Math.round(Math.min(Math.abs(shoulder - hip), 90)),
  };
}