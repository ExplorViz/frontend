import { useFrame, useThree } from '@react-three/fiber';
import { usePlayroomPlayers } from 'explorviz-frontend/src/components/collaboration/playroom-players-context';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import * as THREE from 'three';

// This component syncs the camera settings for spectating mode (not the position)
export default function SpectateCameraController() {
  const { camera } = useThree();
  const players = usePlayroomPlayers();
  const spectatedPlayerId = useSpectateUserStore((state) => state.spectatedPlayerId);

  useFrame(() => {
    if (!spectatedPlayerId || !(camera instanceof THREE.PerspectiveCamera)) return;

    const targetPlayer = players.find(p => p.id === spectatedPlayerId);
    if (!targetPlayer) return;

    const projMatrix = targetPlayer.getState('projectionMatrix');
    if (projMatrix) {
      camera.projectionMatrix.fromArray(projMatrix);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
  });

  return null;
}