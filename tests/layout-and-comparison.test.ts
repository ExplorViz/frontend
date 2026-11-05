import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  ALL_BUILDING_COMPARISONS_VISIBLE,
  isBuildingComparisonFilterActive,
  setBuildingComparisonVisibility,
} from '../src/utils/city-rendering/building-comparison-visibility';
import BoxLayout from '../src/utils/layout/box-layout';

describe('box layout coordinates', () => {
  it('computes centers, area and aspect ratio from extents', () => {
    const box = Object.assign(new BoxLayout(), {
      width: 10,
      height: 2,
      depth: 6,
    });
    box.position = new Vector3(-5, 1, 3);
    expect(box.position.toArray()).toEqual([-5, 1, 3]);
    expect(box.center.toArray()).toEqual([0, 2, 6]);
    expect(box.area).toBe(60);
    expect(box.aspectRatio).toBe(5);
  });
  it.each(['positionX', 'positionY', 'positionZ', 'width', 'height', 'depth'] as const)(
    'invalidates cached geometry when %s changes',
    (property) => {
      const box = new BoxLayout();
      const oldCenter = box.center.clone();
      box.position; // Warm both caches before changing a public field.
      box[property] += 4;
      expect(box.center.equals(oldCenter)).toBe(false);
      expect(box.position.toArray()).toEqual([box.positionX, box.positionY, box.positionZ]);
    }
  );
  it('scales positions and dimensions without mutating a copy', () => {
    const box = Object.assign(new BoxLayout(), {
      positionX: 2,
      width: 4,
      height: 6,
      depth: 8,
    });
    const copy = box.copy();
    box.scale(2);
    expect(box.position.x).toBe(4);
    expect(box.center.toArray()).toEqual([8, 6, 8]);
    expect([copy.positionX, copy.width, copy.height, copy.depth]).toEqual([2, 4, 6, 8]);
  });
});

describe('commit comparison visibility', () => {
  it.each(['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED'] as const)('toggles %s immutably', (category) => {
    const original = { ...ALL_BUILDING_COMPARISONS_VISIBLE };
    const hidden = setBuildingComparisonVisibility(original, category, false);
    expect(isBuildingComparisonFilterActive(original)).toBe(false);
    expect(isBuildingComparisonFilterActive(hidden)).toBe(true);
    expect(original[category]).toBe(true);
    expect(setBuildingComparisonVisibility(hidden, category, false)).toBe(hidden);
    expect(setBuildingComparisonVisibility(hidden, category, true)).toEqual(original);
  });
});
