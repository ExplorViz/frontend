import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { IMMERSIVE_ANIMATION_DURATION_FACTOR } from 'explorviz-frontend/src/utils/city-rendering/immersive-target-position';
import gsap from 'gsap';
import type { MutableRefObject } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';

export function getImmersiveAnimationDuration(baseDuration: number): number {
  return baseDuration * IMMERSIVE_ANIMATION_DURATION_FACTOR;
}

type NumericRecord = Record<string, number>;

/**
 * Kill any previous tween on `tweenRef`, then either snap or animate `from` → `to`.
 * Returns the active tween values object (stored in `tweenRef`) or null if snapped.
 */
export function animateNumericProps<T extends NumericRecord>(options: {
  from: T;
  to: T;
  duration: number;
  animate: boolean;
  tweenRef: MutableRefObject<T | null>;
  onUpdate: (values: T) => void;
  onComplete?: () => void;
  epsilon?: number;
}): void {
  const {
    from,
    to,
    duration,
    animate,
    tweenRef,
    onUpdate,
    onComplete,
    epsilon = 1e-4,
  } = options;

  if (tweenRef.current) {
    gsap.killTweensOf(tweenRef.current);
    tweenRef.current = null;
  }

  const alreadyThere = (Object.keys(to) as (keyof T)[]).every(
    (key) => Math.abs(from[key] - to[key]) < epsilon
  );

  if (!animate || alreadyThere) {
    onUpdate({ ...to });
    onComplete?.();
    return;
  }

  const values = { ...from };
  tweenRef.current = values;

  gsap.to(values, {
    ...to,
    duration,
    onUpdate: () => onUpdate(values),
    onComplete: () => {
      if (tweenRef.current === values) {
        tweenRef.current = null;
      }
      onComplete?.();
    },
  });
}

export function killNumericTween<T extends object>(
  tweenRef: MutableRefObject<T | null>
): void {
  if (tweenRef.current) {
    gsap.killTweensOf(tweenRef.current);
    tweenRef.current = null;
  }
}

export type InstanceHeightTween = {
  height: number;
  positionY: number;
};

/**
 * Set an instanced building's height while keeping its base fixed.
 */
export function animateInstanceBuildingHeight(options: {
  mesh: InstancedMesh2;
  instanceId: number;
  targetHeight: number;
  duration: number;
  animate: boolean;
  tweenRef: MutableRefObject<InstanceHeightTween | null>;
  onComplete?: () => void;
}): void {
  const {
    mesh,
    instanceId,
    targetHeight,
    duration,
    animate,
    tweenRef,
    onComplete,
  } = options;

  const tempMatrix = new Matrix4();
  const pos = new Vector3();
  const quat = new Quaternion();
  const scale = new Vector3();

  try {
    mesh.getMatrixAt(instanceId, tempMatrix);
  } catch {
    onComplete?.();
    return;
  }
  tempMatrix.decompose(pos, quat, scale);

  const baseY = pos.y - scale.y / 2;
  const targetPositionY = baseY + targetHeight / 2;

  animateNumericProps({
    from: { height: scale.y, positionY: pos.y },
    to: { height: targetHeight, positionY: targetPositionY },
    duration,
    animate,
    tweenRef,
    onUpdate: (values) => {
      scale.y = values.height;
      pos.y = values.positionY;
      tempMatrix.compose(pos, quat, scale);
      mesh.setMatrixAt(instanceId, tempMatrix);
    },
    onComplete,
  });
}

export function createBuildingLabelPosition(
  centerX: number,
  centerZ: number,
  positionY: number,
  buildingHeight: number,
  labelOffset: number
): Vector3 {
  return new Vector3(
    centerX,
    positionY + buildingHeight + labelOffset,
    centerZ
  );
}
