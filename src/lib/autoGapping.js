import { clubSortValue, clubTemplate, sortClubBag } from './clubCatalog.js';

/**
 * Carries are stored in yards. Re-gap only when the golfer enters a carry,
 * not when adding/removing equipment. Works with any subset of golf clubs.
 */
export const GAP_CLUB_IDS = [
  'dr', '3w', '5w', '4i', '5i', '6i', '7i',
  '8i', '9i', 'pw', 'gw', 'sw', 'lw',
];
export const DEFAULT_GAP_REFERENCE_ID = '8i';

const validCarry = (n) => Number.isInteger(n) && n >= 1 && n <= 500;
const shape = (id) => clubTemplate(id)?.referenceCarry ?? 0;
const ordered = (clubs) => sortClubBag(clubs).filter((c) => c.id !== 'pt');

export function preferredGapReference(clubs, priorReference = DEFAULT_GAP_REFERENCE_ID) {
  const full = ordered(clubs);
  const mids = full.slice(1, -1);
  if (!mids.length) return full[0]?.id ?? DEFAULT_GAP_REFERENCE_ID;
  if (mids.some((c) => c.id === priorReference)) return priorReference;
  return mids.reduce((best, club) =>
    Math.abs(clubSortValue(club.id) - clubSortValue(DEFAULT_GAP_REFERENCE_ID)) <
      Math.abs(clubSortValue(best.id) - clubSortValue(DEFAULT_GAP_REFERENCE_ID))
      ? club : best
  ).id;
}

export function autoGapCarry(clubs, editedId, carryYards, referenceId = DEFAULT_GAP_REFERENCE_ID) {
  if (!Array.isArray(clubs)) return { clubs, referenceId, error: 'Bag unavailable.' };
  const next = clubs.map((club) => ({ ...club }));
  const edited = next.find((club) => club.id === editedId);
  if (!edited || !Number.isFinite(carryYards) || carryYards < 0 || carryYards > 500) {
    return { clubs, referenceId, error: 'Enter a valid carry distance.' };
  }
  const proposed = Math.round(carryYards);
  if (editedId === 'pt') {
    edited.carry = proposed;
    return { clubs: next, referenceId };
  }
  if (!clubTemplate(editedId)) return { clubs, referenceId, error: 'Unknown club.' };

  const full = ordered(next);
  if (full.length === 1) {
    if (!validCarry(proposed)) return { clubs, referenceId, error: 'Enter a positive carry.' };
    edited.carry = proposed;
    return { clubs: next, referenceId: full[0].id, error: null };
  }

  // The longest present club and shortest present club are fixed endpoints.
  // When Driver and L-Wedge exist, those are the endpoints requested by user.
  const firstId = full[0].id;
  const lastId = full[full.length - 1].id;
  const isEndpoint = editedId === firstId || editedId === lastId;
  const chosenReference = isEndpoint
    ? preferredGapReference(next, referenceId)
    : editedId;

  edited.carry = proposed;
  const byId = new Map(next.map((c) => [c.id, c]));
  const first = byId.get(firstId);
  const last = byId.get(lastId);

  if (full.length === 2) {
    if (!validCarry(first.carry) || !validCarry(last.carry) || first.carry <= last.carry) {
      return { clubs, referenceId, error: 'Longer clubs must carry farther than shorter clubs.' };
    }
    return { clubs: next, referenceId: chosenReference, error: null };
  }

  const anchorIndex = full.findIndex((c) => c.id === chosenReference);
  const anchor = byId.get(chosenReference);
  if (anchorIndex < 1 || anchorIndex >= full.length - 1 ||
      !validCarry(first.carry) || !validCarry(anchor.carry) || !validCarry(last.carry) ||
      first.carry - anchor.carry < anchorIndex ||
      anchor.carry - last.carry < full.length - 1 - anchorIndex) {
    return {
      clubs,
      referenceId,
      error: 'Carry must fit between your longest and shortest clubs with room for each club.',
    };
  }

  const firstShape = shape(firstId), anchorShape = shape(chosenReference), lastShape = shape(lastId);
  for (let i = 1; i < full.length - 1; i += 1) {
    if (i === anchorIndex) continue;
    const id = full[i].id;
    const upper = i < anchorIndex;
    const span = upper ? firstShape - anchorShape : anchorShape - lastShape;
    const weight = span > 0
      ? (upper ? firstShape - shape(id) : anchorShape - shape(id)) / span
      : (upper ? i / anchorIndex : (i - anchorIndex) / (full.length - 1 - anchorIndex));
    const predicted = upper
      ? first.carry + (anchor.carry - first.carry) * weight
      : anchor.carry + (last.carry - anchor.carry) * weight;
    byId.get(id).carry = Math.round(predicted);
  }
  return { clubs: sortClubBag(next), referenceId: chosenReference, error: null };
}
