import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CHARACTERS } from '../shared/characters.js';
import { hexToRgba, shadeHex } from '../src/game/rendering/CanvasArtHelpers.js';

test('CanvasArtHelpers produce valid shaded rgb and rgba strings', () => {
  const lighter = shadeHex('#f97316', 20);
  const darker = shadeHex('#f97316', -25);
  const rgba = hexToRgba('#facc15', 0.5);
  assert.ok(lighter.startsWith('rgb('));
  assert.ok(darker.startsWith('rgb('));
  assert.notEqual(lighter, darker);
  assert.equal(rgba, 'rgba(250, 204, 21, 0.5)');
});

test('All 9 characters have complete palette, prop, headgear, and special durations for 2.5D baking', () => {
  assert.equal(ALL_CHARACTERS.length, 9);
  const headgears = new Set<string>();
  const props = new Set<string>();

  for (const c of ALL_CHARACTERS) {
    assert.ok(c.palette.skin.startsWith('#'));
    assert.ok(c.palette.primary.startsWith('#'));
    assert.ok(c.palette.secondary.startsWith('#'));
    assert.ok(c.palette.accent.startsWith('#'));
    assert.ok(c.palette.hair.startsWith('#'));
    assert.ok(c.palette.aura.startsWith('#'));
    assert.ok(c.specialDurationFrames >= 180, `${c.id} must have synced specialDurationFrames`);
    headgears.add(c.headgear);
    props.add(c.propType);
  }

  assert.equal(headgears.size, 9, 'Every fighter should have unique headgear');
  assert.equal(props.size, 9, 'Every fighter should have unique prop');
});
