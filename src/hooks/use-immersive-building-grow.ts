import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useImmersiveViewStore } from 'explorviz-frontend/src/stores/immersive-view-store';
import {
  animateInstanceBuildingHeight,
  getImmersiveAnimationDuration,
  killNumericTween,
  type InstanceHeightTween,
} from 'explorviz-frontend/src/utils/city-rendering/immersive-building-animation';
import {
  getImmersiveFeetWorldPosition,
  getImmersiveGrownBuildingHeight,
} from 'explorviz-frontend/src/utils/city-rendering/immersive-target-position';
import { useEffect, useRef, type RefObject } from 'react';

interface UseImmersiveBuildingGrowOptions {
  meshRef: RefObject<InstancedMesh2 | null>;
  buildingIdToInstanceId: RefObject<Map<string, number>>;
  /** Returns the building's normal (non-immersive) height, or null if unknown. */
  getBuildingHeight: (buildingId: string) => number | null;
  enableAnimations: boolean;
  animationDuration: number;
}

/**
 * Grows the inspected building so its roof meets the user's feet in immersive
 * view, and restores height (with matching label follow height) on exit.
 */
export function useImmersiveBuildingGrow({
  meshRef,
  buildingIdToInstanceId,
  getBuildingHeight,
  enableAnimations,
  animationDuration,
}: UseImmersiveBuildingGrowOptions): void {
  const activeImmersiveMeshId = useImmersiveViewStore(
    (state) => state.activeMeshId
  );
  const immersiveTargetPosition = useImmersiveViewStore(
    (state) => state.targetPosition
  );
  const setImmersiveBuildingHeight = useImmersiveViewStore(
    (state) => state.setImmersiveBuildingHeight
  );

  const grownBuildingIdRef = useRef<string | null>(null);
  const tweenRef = useRef<InstanceHeightTween | null>(null);
  const duration = getImmersiveAnimationDuration(animationDuration);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const previousGrownId = grownBuildingIdRef.current;

    const applyHeight = (
      buildingId: string,
      targetHeight: number,
      onComplete?: () => void
    ) => {
      const instanceId = buildingIdToInstanceId.current.get(buildingId);
      if (instanceId === undefined) {
        onComplete?.();
        return;
      }

      animateInstanceBuildingHeight({
        mesh,
        instanceId,
        targetHeight,
        duration,
        animate: enableAnimations,
        tweenRef,
        onComplete,
      });
    };

    const restoreBuilding = (buildingId: string) => {
      const normalHeight = getBuildingHeight(buildingId);
      if (normalHeight === null) {
        setImmersiveBuildingHeight(null, null);
        return;
      }
      // Keep the label mounted and tween it down with the building.
      setImmersiveBuildingHeight(buildingId, normalHeight);
      applyHeight(buildingId, normalHeight, () =>
        setImmersiveBuildingHeight(null, null)
      );
    };

    if (previousGrownId && previousGrownId !== activeImmersiveMeshId) {
      if (buildingIdToInstanceId.current.has(previousGrownId)) {
        restoreBuilding(previousGrownId);
      }
      grownBuildingIdRef.current = null;
    }

    if (!activeImmersiveMeshId || !immersiveTargetPosition) {
      return () => killNumericTween(tweenRef);
    }

    const instanceId =
      buildingIdToInstanceId.current.get(activeImmersiveMeshId);
    if (instanceId === undefined) {
      return () => killNumericTween(tweenRef);
    }

    const feetWorld = getImmersiveFeetWorldPosition(
      mesh,
      immersiveTargetPosition
    );
    const grownHeight = getImmersiveGrownBuildingHeight(
      mesh,
      instanceId,
      feetWorld
    );
    if (grownHeight === null) {
      return () => killNumericTween(tweenRef);
    }

    grownBuildingIdRef.current = activeImmersiveMeshId;
    setImmersiveBuildingHeight(activeImmersiveMeshId, grownHeight);
    applyHeight(activeImmersiveMeshId, grownHeight);

    return () => killNumericTween(tweenRef);
  }, [
    activeImmersiveMeshId,
    immersiveTargetPosition,
    enableAnimations,
    duration,
    meshRef,
    buildingIdToInstanceId,
    getBuildingHeight,
    setImmersiveBuildingHeight,
  ]);
}
