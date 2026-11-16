import { describe, expect, it } from 'vitest';
import { assignStackIndices, type StackableBox } from '../src/utils/dom-box-stacking';

function box(x: number, y: number, width: number, height: number, level = 0): StackableBox {
  return { position: [x, y], size: [width, height], level, stackIndex: -1 };
}

describe('assignStackIndices', () => {
  it('keeps boxes that do not overlap (or only touch) at the base of their layer', () => {
    const boxes = [box(0, 0, 10, 10), box(10, 0, 10, 10), box(30, 0, 5, 5)];

    expect(assignStackIndices(boxes)).toBe(0);
    expect(boxes.map((b) => b.stackIndex)).toEqual([0, 0, 0]);
  });

  it('places smaller overlapping boxes in front of larger ones', () => {
    const small = box(0, 0, 4, 4);
    const large = box(0, 0, 20, 20);
    const medium = box(2, 2, 10, 10);

    expect(assignStackIndices([small, large, medium])).toBe(2);
    expect([large.stackIndex, medium.stackIndex, small.stackIndex]).toEqual([0, 1, 2]);
  });

  it('places the later of two equally sized overlapping boxes in front, like the browser paints them', () => {
    const first = box(0, 0, 10, 10);
    const second = box(5, 0, 10, 10);

    assignStackIndices([first, second]);
    expect([first.stackIndex, second.stackIndex]).toEqual([0, 1]);
  });

  it('only stacks boxes of the same level', () => {
    const parent = box(0, 0, 20, 20, 0);
    const child = box(0, 0, 10, 10, 1);

    expect(assignStackIndices([parent, child])).toBe(0);
    expect([parent.stackIndex, child.stackIndex]).toEqual([0, 0]);
  });
});
