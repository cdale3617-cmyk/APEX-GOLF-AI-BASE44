import assert from 'node:assert/strict';
import test from 'node:test';
import { addClubToBag, CLUB_CATALOG, MAX_BAG_CLUBS, removeClubFromBag, sortClubBag } from '../src/lib/clubCatalog.js';
import { autoGapCarry, preferredGapReference } from '../src/lib/autoGapping.js';

const selected = ['dr','3w','5w','4i','5i','6i','7i','8i','9i','pw','gw','sw','lw','pt'];
const carry = Object.fromEntries([
  ['dr',280],['3w',245],['5w',225],['4i',205],['5i',192],['6i',180],
  ['7i',168],['8i',155],['9i',142],['pw',130],['gw',118],['sw',102],['lw',88],['pt',0],
]);
const bag = () => selected.map((id) => ({
  id, name:CLUB_CATALOG.find((c)=>c.id===id).name, carry:carry[id], miss:'Straight', active:true,
}));
const c = (clubs,id) => clubs.find((club)=>club.id===id)?.carry;

test('Bag is capped at 14 clubs; cannot add duplicate', () => {
  const existing=bag();
  assert.equal(MAX_BAG_CLUBS,14);
  const full = addClubToBag(existing,'7w');
  assert.match(full.error,/14 clubs/i);
  assert.deepEqual(full.clubs,existing);
  const duplicate=addClubToBag(existing,'7i');
  assert.match(duplicate.error,/already/);
  assert.deepEqual(duplicate.clubs,existing);
});

test('Remove 4-Iron then insert 4-Hybrid in correct distance order', () => {
  const original=bag();
  const removed=removeClubFromBag(original,'4i');
  assert.equal(removed.error,null);
  assert.equal(removed.clubs.length,13);
  assert.equal(removed.clubs.some(x=>x.id==='4i'),false);
  assert.equal(c(removed.clubs,'dr'),280);
  assert.equal(c(removed.clubs,'lw'),88);
  const replacement=addClubToBag(removed.clubs,'4h');
  assert.equal(replacement.error,null);
  const ids = replacement.clubs.map(x=>x.id);
  assert.equal(ids.length,14);
  assert.equal(ids.at(-1),'pt');
  assert.ok(ids.indexOf('5w') < ids.indexOf('4h'));
  assert.ok(ids.indexOf('4h') < ids.indexOf('5i'));
  assert.ok(c(replacement.clubs,'4h') < 225 && c(replacement.clubs,'4h') > 192);
  assert.equal(c(replacement.clubs,'8i'),155);
  assert.deepEqual(original,bag(),'original bag unchanged');
});

test('Several replacements inserted in the right order irrespective of add order', () => {
  let clubs=bag();
  for (const id of ['5w','4i','5i']) {
    const result=removeClubFromBag(clubs,id);
    assert.equal(result.error,null);
    clubs=result.clubs;
  }
  for (const id of ['5h','7w','3h']) {
    const result=addClubToBag(clubs,id);
    assert.equal(result.error,null);
    clubs=result.clubs;
  }
  const ids=clubs.map(c=>c.id);
  assert.ok(ids.indexOf('7w')<ids.indexOf('3h'));
  assert.ok(ids.indexOf('3h')<ids.indexOf('5h'));
  assert.ok(ids.indexOf('5h')<ids.indexOf('6i'));
  assert.equal(ids.at(-1),'pt');
  const gapped=autoGapCarry(clubs,'8i',148);
  assert.equal(gapped.error,null);
  assert.equal(c(gapped.clubs,'dr'),280);
  assert.equal(c(gapped.clubs,'lw'),88);
  assert.equal(c(gapped.clubs,'8i'),148);
  assert.deepEqual(gapped.clubs.map(c=>c.id),ids);
});

test('Removing the reference iron selects another present club safely', () => {
  const removed=removeClubFromBag(bag(),'8i');
  const reference=preferredGapReference(removed.clubs,'8i');
  assert.equal(removed.clubs.some(c=>c.id===reference),true);
  const adjusted=autoGapCarry(removed.clubs,'7i',164,reference);
  assert.equal(adjusted.error,null);
  assert.equal(c(adjusted.clubs,'dr'),280);
  assert.equal(c(adjusted.clubs,'lw'),88);
});

test('Driver or L-Wedge may be removed without breaking gapping', () => {
  let clubs=removeClubFromBag(bag(),'dr').clubs;
  clubs=removeClubFromBag(clubs,'lw').clubs;
  const result=autoGapCarry(clubs,'8i',148);
  assert.equal(result.error,null);
  assert.equal(c(result.clubs,'3w'),245);
  assert.equal(c(result.clubs,'sw'),102);
  assert.equal(c(result.clubs,'pt'),0);
});

test('Removing unknown club is safe; sorting keeps Putter last', () => {
  const current=bag();
  const result=removeClubFromBag(current,'xyz');
  assert.ok(result.error);
  assert.deepEqual(result.clubs,current);
  assert.deepEqual(sortClubBag([...current].reverse()).map(c=>c.id),selected);
});
