import { expect, it } from 'vitest';
import { snapPosition } from '../src/utils/collaboration/screen-wall-arrangement';

// 24 inch Full HD: 53.13 cm × 29.89 cm.
const fullHd = (x: number, y: number) => ({ name: '', width: 1920, height: 1080, diagonal: 24, x, y });

it('snaps a dragged Tile edge to a nearby edge of another Tile', () => {
  const tiles = [fullHd(0, 0), fullHd(100, 0)];

  const snapped = snapPosition(tiles, 1, 54, 0.8, 1);

  expect(snapped.x).toBeCloseTo(53.13, 2);
  expect(snapped.y).toBe(0);
});

it('snaps right and bottom edges as well', () => {
  const tiles = [fullHd(0, 0), fullHd(0, 100)];

  // Its right edge to the other's right edge, its bottom edge to the other's top edge.
  const snapped = snapPosition(tiles, 1, 0.5, -30.4, 1);

  expect(snapped.x).toBe(0);
  expect(snapped.y).toBeCloseTo(-29.89, 2);
});

it('leaves a Tile where it is dropped when no edge is near, so gaps stay possible', () => {
  const tiles = [fullHd(0, 0), fullHd(100, 0)];

  expect(snapPosition(tiles, 1, 56, 5, 1)).toEqual({ x: 56, y: 5 });
});
