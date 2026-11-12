import { useFrame, useThree } from '@react-three/fiber';
import { CAMERA_UPDATES_PER_SECOND } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { latestCameraOf, sendCamera, useSpectating } from 'explorviz-frontend/src/utils/collaboration/spectating';
import type { CameraControls as CameraControlsImpl } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Less a little, so that two frames at 60 Hz do not fall short of it by rounding.
const SEND_INTERVAL = 1 / CAMERA_UPDATES_PER_SECOND - 1e-4;

/** The default controls, usually drei's CameraControls (camera-controls). */
type OwnControls = { enabled: boolean } & Partial<Pick<CameraControlsImpl, 'getPosition' | 'getTarget' | 'setLookAt'>>;

function setEnabled(controls: OwnControls, enabled: boolean) {
  controls.enabled = enabled;
}

/** camera-controls only writes the camera when it moves; make it put back where you were. */
function returnToOwnView(controls: OwnControls) {
  if (!controls.getPosition || !controls.getTarget || !controls.setLookAt) return;
  const position = controls.getPosition(new THREE.Vector3());
  const target = controls.getTarget(new THREE.Vector3());
  controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
}

/**
 * Spectating in the render loop: while you spectate, your camera takes the
 * spectated Participant's pose and projection; while others spectate you,
 * your camera is sent to them, at most 30 times per second and only when it
 * changed.
 */
export default function SpectateCameraController() {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OwnControls | null;
  const { target, spectators } = useSpectating();
  const isSpectated = spectators.length > 0;
  const lastSent = useRef<number[] | undefined>(undefined);
  const sinceSent = useRef(Infinity);

  // A new spectator gets the camera right away, even if it is still.
  const spectatorKey = spectators.join(' ');
  useEffect(() => {
    lastSent.current = undefined;
    sinceSent.current = Infinity;
  }, [spectatorKey]);

  // Your own controls would fight the spectated camera.
  useEffect(() => {
    if (!target || !controls) return;
    setEnabled(controls, false);
    return () => {
      setEnabled(controls, true);
      returnToOwnView(controls);
    };
  }, [target, controls]);

  // Back to your own projection when spectating ends.
  useEffect(() => {
    if (!target) return;
    return () => {
      if (camera instanceof THREE.PerspectiveCamera) camera.updateProjectionMatrix();
    };
  }, [target, camera]);

  useFrame((_, delta) => {
    if (target) {
      const pose = latestCameraOf(target);
      if (!pose || !(camera instanceof THREE.PerspectiveCamera)) return;
      camera.position.fromArray(pose.position);
      camera.quaternion.fromArray(pose.quaternion);
      camera.projectionMatrix.fromArray(pose.projection);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      return;
    }
    if (!isSpectated) return;
    sinceSent.current += delta;
    if (sinceSent.current < SEND_INTERVAL) return;

    const position = camera.position.toArray();
    const quaternion = camera.quaternion.toArray() as [number, number, number, number];
    const projection = camera.projectionMatrix.toArray();
    const flat = [...position, ...quaternion, ...projection];
    if (lastSent.current && flat.every((value, i) => value === lastSent.current![i])) return;
    sendCamera({ position, quaternion, projection });
    lastSent.current = flat;
    sinceSent.current = 0;
  });

  return null;
}
