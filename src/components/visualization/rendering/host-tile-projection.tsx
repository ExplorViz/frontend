import { useFrame, useThree } from '@react-three/fiber';
import { useCanvasFullscreen } from 'explorviz-frontend/src/utils/canvas-fullscreen';
import {
  applyTileProjection,
  restoreOwnProjection,
  useOwnTileView,
} from 'explorviz-frontend/src/utils/collaboration/screen-wall-projection';
import { useOwnTile } from 'explorviz-frontend/src/utils/collaboration/screen-wall-tile';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * The Host as a Tile: while fullscreen on its Tile, the Host's camera renders
 * that Tile's part of the wall with the Host's own FOV, and the Host keeps its
 * controls, since it drives the wall. Out of fullscreen: the normal view.
 */
export default function HostTileProjection() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const tile = useOwnTile();
  const view = useOwnTileView();
  const fullscreen = useCanvasFullscreen();
  const shown = tile?.isHost && fullscreen ? view : undefined;
  const isShown = !!shown;
  const ownFov = useRef(75);

  useEffect(() => {
    if (!isShown || !(camera instanceof THREE.PerspectiveCamera)) return;
    ownFov.current = camera.fov;
    return () => restoreOwnProjection(camera, ownFov.current, size.width / size.height);
  }, [isShown, camera, size]);

  useFrame(() => {
    if (shown && camera instanceof THREE.PerspectiveCamera) applyTileProjection(camera, ownFov.current, shown);
  });

  return null;
}
