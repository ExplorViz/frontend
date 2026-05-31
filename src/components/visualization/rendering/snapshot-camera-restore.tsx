import { CameraControls } from '@react-three/drei';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { SnapshotCamera } from 'explorviz-frontend/src/stores/snapshot-token';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const POSE_EPSILON = 0.05;

function cameraPoseMatches(
  controls: CameraControls,
  camera: SnapshotCamera
): boolean {
  if (!controls) {
    return false;
  }

  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  controls.getPosition(position);
  controls.getTarget(target);

  const expectedPosition = new THREE.Vector3(camera.x, camera.y, camera.z);
  const expectedTarget = new THREE.Vector3(
    camera.targetX ?? 0,
    camera.targetY ?? 0,
    camera.targetZ ?? 0
  );

  return (
    position.distanceTo(expectedPosition) < POSE_EPSILON &&
    target.distanceTo(expectedTarget) < POSE_EPSILON
  );
}

/**
 * Restores the snapshot camera inside the R3F render loop.
 * CameraControls is often not ready when snapshot restore starts; this retries
 * until the saved pose is actually applied.
 */
export default function SnapshotCameraRestore() {
  const snapshotSelected = useSnapshotTokenStore(
    (state) => state.snapshotSelected
  );
  const snapshotToken = useSnapshotTokenStore((state) => state.snapshotToken);
  const restoredSnapshotKeyRef = useRef<string | null>(null);

  useEffect(() => {
    restoredSnapshotKeyRef.current = null;
  }, [snapshotToken?.owner, snapshotToken?.createdAt, snapshotSelected]);

  useFrame(() => {
    if (!snapshotSelected || !snapshotToken?.camera) {
      return;
    }

    const snapshotKey = `${snapshotToken.owner}-${snapshotToken.createdAt}`;
    if (restoredSnapshotKeyRef.current === snapshotKey) {
      return;
    }

    const controls =
      useCameraControlsStore.getState().cameraControlsRef?.current;
    if (!controls) {
      return;
    }

    const camera = snapshotToken.camera;

    if (!cameraPoseMatches(controls, camera)) {
      useCameraControlsStore
        .getState()
        .applySnapshotCamera(camera, false);
      controls.update(0);
      return;
    }

    restoredSnapshotKeyRef.current = snapshotKey;
    useCameraControlsStore.setState({ pendingSnapshotCamera: null });
  });

  return null;
}
