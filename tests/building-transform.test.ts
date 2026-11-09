import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildingTransformMatches } from '../src/utils/city-rendering/building-transform';

describe('building transform comparison', () => {
  const targetPosition = new Vector3(12345.6789, 0.3, -987.6543);
  const targetScale = new Vector3(0.7, 12.3456, 0.9);

  function storedTransform() {
    const matrix = new Matrix4().compose(targetPosition, new Quaternion(), targetScale);
    matrix.fromArray(new Float32Array(matrix.elements));
    const position = new Vector3();
    const scale = new Vector3();
    matrix.decompose(position, new Quaternion(), scale);
    return { position, scale };
  }

  it('recognizes a fixed layout after the instanced matrix loses precision', () => {
    const { position, scale } = storedTransform();
    expect(position.equals(targetPosition)).toBe(false);
    expect(buildingTransformMatches(position, scale, targetPosition, targetScale)).toBe(true);
  });

  it.each(['x', 'y', 'z'] as const)('detects a position change on %s', (axis) => {
    const { position, scale } = storedTransform();
    position[axis] += 0.01;
    expect(buildingTransformMatches(position, scale, targetPosition, targetScale)).toBe(false);
  });

  it.each(['x', 'y', 'z'] as const)('detects a size change on %s', (axis) => {
    const { position, scale } = storedTransform();
    scale[axis] += 0.01;
    expect(buildingTransformMatches(position, scale, targetPosition, targetScale)).toBe(false);
  });
});
