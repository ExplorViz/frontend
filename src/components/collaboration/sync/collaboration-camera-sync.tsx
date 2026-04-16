import { useFrame, useThree } from '@react-three/fiber';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useSpectateStatusStore } from 'explorviz-frontend/src/stores/collaboration/spectate-status-store';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import { getPoses, VrPose } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/vr-poses';
import equal from 'fast-deep-equal';
import { myPlayer, usePlayersList } from 'playroomkit';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// This component is responsible to synchronize the cameras for spectating

export default function CollaborationCameraSync() {
  const { camera } = useThree();
  const players = usePlayersList();
  const localUserStore = useLocalUserStore();

  const spectatedPlayerId = useSpectateUserStore((state) => state.spectatedPlayerId);
  const deactivateSpectate = useSpectateUserStore((state) => state.deactivate);

  const lastPoseRef = useRef<VrPose | null>(null);
  const cameraSyncedRef = useRef<THREE.PerspectiveCamera | null>(null);
  // Register the main camera in the localUserStore
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera && cameraSyncedRef.current !== camera) {
      useLocalUserStore.getState().setDefaultCamera(camera);
      cameraSyncedRef.current = camera;
    }
  }, [camera]);

  useFrame((_, delta) => {
    const me = myPlayer();
    if (!me) return;

    // Animations to make everything smooth
    const animationMixer = localUserStore.animationMixer;
    if (animationMixer) animationMixer.update(delta);

    // Case 1: The current player is spectating someone else
    // Here, the current camera positons of this player is searched in its player state
    if (spectatedPlayerId) {
      const targetPlayer = players.find(p => p.id === spectatedPlayerId);

      if (targetPlayer) {
        const poses = targetPlayer.getState('vrPoses');
        if (poses && poses.camera) {
          camera.position.fromArray(poses.camera.position);
          camera.quaternion.fromArray(poses.camera.quaternion);
        }
      } else {
        // Should the spectated palyer leave the room, end spectating
        deactivateSpectate();
      }
      return;
    }

    // Case 2: The current player is not spectating (controlling the own camera by itself)
    const spectatorCount = useSpectateStatusStore.getState().spectators.size;
    // If no one is spectating the current player, don't waste netwoprk traffic and do nothing
    if (spectatorCount === 0) return;

    const poses = getPoses(camera, localUserStore.controller1, localUserStore.controller2);
    const lastPose = lastPoseRef.current;

    // Only change the current players state, if the camera changed (to safe network bandwidth)
    if (!lastPose || !equal(lastPose, poses)) {
      me.setState('vrPoses', poses);

      me.setState('projectionMatrix', camera.projectionMatrix.toArray());

      lastPoseRef.current = poses;
    }
  });

  return null;
}