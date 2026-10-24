/**
 * Supported clubs and their normal longest-to-shortest ordering.
 * Reference carries are YARDS and only seed a newly added club / gapping shape;
 * they never replace the golfer's measured carry for an existing club.
 */
export const MAX_BAG_CLUBS = 14;

export const CLUB_CATALOG = /** @type {[string, string, number][]} */ ([
  ['dr', 'Driver', 280],
  ['2w', '2-Wood', 258],
  ['3w', '3-Wood', 245],
  ['4w', '4-Wood', 235],
  ['2h', '2-Hybrid', 230],
  ['5w', '5-Wood', 225],
  ['7w', '7-Wood', 218],
  ['3h', '3-Hybrid', 215],
  ['2i', '2-Iron', 212],
  ['3i', '3-Iron', 209],
  ['4i', '4-Iron', 205],
  ['9w', '9-Wood', 202],
  ['4h', '4-Hybrid', 199],
  ['5i', '5-Iron', 192],
  ['5h', '5-Hybrid', 187],
  ['6i', '6-Iron', 180],
  ['6h', '6-Hybrid', 174],
  ['7i', '7-Iron', 168],
  ['8i', '8-Iron', 155],
  ['9i', '9-Iron', 142],
  ['pw', 'P-Wedge', 130],
  ['aw', 'A-Wedge', 124],
  ['gw', 'G-Wedge', 118],
  ['sw', 'S-Wedge', 102],
  ['lw', 'L-Wedge', 88],
  ['pt', 'Putter', 0],
]).map(([id, name, referenceCarry], order) => ({
  id, name, referenceCarry, order,
}));

const byId = new Map(CLUB_CATALOG.map((c) => [c.id, c]));
export const clubTemplate = (id) => byId.get(id) ?? null;
export const clubSortValue = (id) => byId.get(id)?.order ?? 1000;

/** Place clubs in sensible club-type/distance order, regardless of add sequence. */
export function sortClubBag(clubs) {
  return [...clubs].sort((a, b) =>
    clubSortValue(a.id) - clubSortValue(b.id) || a.name.localeCompare(b.name)
  );
}

/** Add one optional club, not a second copy, preserving every other entered carry. */
export function addClubToBag(clubs, id) {
  const template = clubTemplate(id);
  if (!template) return { clubs, error: 'Choose a club from the list.' };
  if (clubs.some((c) => c.id === id)) return { clubs, error: 'That club is already in your bag.' };
  if (clubs.length >= MAX_BAG_CLUBS) {
    return { clubs, error: 'Your bag already has 14 clubs. Remove one before adding another.' };
  }

  // Interpolate a realistic initial carry between surrounding clubs in the
  // canonical order. Existing custom carries are never overwritten.
  const before = sortClubBag(clubs.filter((c) => c.id !== 'pt' && c.carry > 0));
  const left = [...before].reverse().find((c) => clubSortValue(c.id) < template.order);
  const right = before.find((c) => clubSortValue(c.id) > template.order);
  let carry = template.referenceCarry;

  if (id === 'pt') carry = 0;
  else if (left && right) {
    const leftShape = clubTemplate(left.id)?.referenceCarry ?? left.carry;
    const rightShape = clubTemplate(right.id)?.referenceCarry ?? right.carry;
    const share = leftShape > rightShape
      ? (leftShape - template.referenceCarry) / (leftShape - rightShape)
      : (template.order - clubSortValue(left.id)) / (clubSortValue(right.id) - clubSortValue(left.id));
    carry = Math.round(left.carry + (right.carry - left.carry) * share);
    if (left.carry > right.carry + 1) carry = Math.max(right.carry + 1, Math.min(left.carry - 1, carry));
  } else if (left) {
    carry = Math.round(left.carry - ((clubTemplate(left.id)?.referenceCarry ?? left.carry) - template.referenceCarry));
  } else if (right) {
    carry = Math.round(right.carry + (template.referenceCarry - (clubTemplate(right.id)?.referenceCarry ?? right.carry)));
  }

  carry = id === 'pt' ? 0 : Math.max(1, Math.min(500, carry));
  const club = { id, name: template.name, carry, miss: 'Straight', active: true };
  return { clubs: sortClubBag([...clubs, club]), error: null, club };
}

export function removeClubFromBag(clubs, id) {
  if (!clubs.some((club) => club.id === id)) return { clubs, error: 'Club not found.' };
  return { clubs: sortClubBag(clubs.filter((club) => club.id !== id)), error: null };
}
