import { useFrame, useThree } from '@react-three/fiber';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import {
  getPoses,
  VrPose,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/vr-poses';
import equal from 'fast-deep-equal';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Component that syncs the React Three Fiber camera with the local user store
 * and sends camera positions when connected to a collaboration room.
 * This component must be placed inside a Canvas component to access the camera via useThree hook.
 */
export default function CollaborationCameraSync() {
  const { camera } = useThree();
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const localUserStore = useLocalUserStore();
  const spectateUserStore = useSpectateUserStore();
  const sendPoseUpdate = useMessageSenderStore((state) => state.sendPoseUpdate);

  // Track last pose to avoid sending duplicate updates
  const lastPoseRef = useRef<VrPose | null>(null);
  // Track if camera has been synced to prevent infinite loops
  const cameraSyncedRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Sync React Three Fiber camera with local-user store's defaultCamera
  useEffect(() => {
    if (
      camera instanceof THREE.PerspectiveCamera &&
      cameraSyncedRef.current !== camera
    ) {
      // Use getState() to avoid triggering re-renders
      useLocalUserStore.getState().setDefaultCamera(camera);
      cameraSyncedRef.current = camera;
    }
  }, [camera]);

  useFrame((_, delta) => {
    // Only send positions when connected to a room
    if (!isOnline()) {
      return;
    }

    // Update animation mixer
    const animationMixer = localUserStore.animationMixer;
    if (animationMixer) {
      animationMixer.update(delta);
    }

    // Handle spectating logic
    spectateUserStore.tick();

    // Send camera positions when not spectating a user
    // (When spectating, spectateUserStore.tick() handles sending positions)
    if (!spectateUserStore.isActive()) {
      // Get poses from the React Three Fiber camera
      const poses = getPoses(
        camera,
        localUserStore.controller1,
        localUserStore.controller2
      );

      // Only send if pose has changed (to avoid unnecessary network traffic)
      const lastPose = lastPoseRef.current;
      if (!lastPose || !equal(lastPose, poses)) {
        sendPoseUpdate(poses.camera, poses.controller1, poses.controller2);
        lastPoseRef.current = poses;
      }
    }
  });

  return null;
}
