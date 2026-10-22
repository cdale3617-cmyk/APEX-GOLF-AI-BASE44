/**
 * Automatic carry-distance gapping for the 13 full-swing clubs.
 * Driver and lob wedge remain user-set endpoints. A selected club (such as 8i)
 * is the third anchor; all other full-swing carries are interpolated using the
 * existing reference gap proportions, rather than equal spacing.
 * Stored distances are always yards. The putting club is never adjusted.
 */
export const GAP_CLUB_IDS = [
  'dr', '3w', '5w', '4i', '5i', '6i', '7i',
  '8i', '9i', 'pw', 'gw', 'sw', 'lw',
];

export const DEFAULT_GAP_REFERENCE_ID = '8i';

// Reference proportions only, NOT a replacement for the user's own distances.
const SHAPE = [280, 245, 225, 205, 192, 180, 168, 155, 142, 130, 118, 102, 88];

const indexOf = (id) => GAP_CLUB_IDS.indexOf(id);
const whole = (n) => Number.isFinite(n) && n >= 1 && n <= 500 && Number.isInteger(n);

export function autoGapCarry(clubs, editedId, carryYards, referenceId = DEFAULT_GAP_REFERENCE_ID) {
  if (!Array.isArray(clubs)) return { clubs, referenceId, error: 'Bag unavailable.' };

  const next = clubs.map((club) => ({ ...club }));
  const edited = next.find((club) => club.id === editedId);
  if (!edited || !Number.isFinite(carryYards) || carryYards < 0 || carryYards > 500) {
    return { clubs, referenceId, error: 'Enter a valid carry distance.' };
  }

  const proposed = Math.round(carryYards);
  if (editedId === 'pt') {
    return { clubs: next.map((club) => club.id === 'pt' ? { ...club, carry: proposed } : club), referenceId };
  }

  if (indexOf(editedId) < 0) {
    return { clubs, referenceId, error: 'Club is not in the gapping order.' };
  }

  const byId = new Map(next.map((club) => [club.id, club]));
  if (!GAP_CLUB_IDS.every((id) => byId.has(id))) {
    return { clubs, referenceId, error: 'The full club set is required for automatic gapping.' };
  }

  byId.get(editedId).carry = proposed;
  const chosenReference = editedId !== 'dr' && editedId !== 'lw'
    ? editedId
    : (indexOf(referenceId) > 0 && indexOf(referenceId) < indexOf('lw')
      ? referenceId : DEFAULT_GAP_REFERENCE_ID);
  const r = indexOf(chosenReference), end = indexOf('lw');
  const driver = byId.get('dr').carry;
  const reference = byId.get(chosenReference).carry;
  const lob = byId.get('lw').carry;

  // Avoid implausible crossed clubs or collapsed gaps. A yard per interval
  // is the minimum necessary to keep carries strictly descending.
  if (!whole(driver) || !whole(reference) || !whole(lob) ||
      driver - reference < r || reference - lob < end - r) {
    return {
      clubs,
      referenceId,
      error: 'Carry must fit between your Driver and L-Wedge, with room for each club.',
    };
  }

  for (let i = 1; i < end; i += 1) {
    if (i === r) continue;
    const fraction = i < r
      ? (SHAPE[0] - SHAPE[i]) / (SHAPE[0] - SHAPE[r])
      : (SHAPE[r] - SHAPE[i]) / (SHAPE[r] - SHAPE[end]);
    const target = i < r
      ? driver + (reference - driver) * fraction
      : reference + (lob - reference) * fraction;
    byId.get(GAP_CLUB_IDS[i]).carry = Math.round(target);
  }

  return { clubs: next, referenceId: chosenReference, error: null };
}
