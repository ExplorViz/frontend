import { useFrame } from '@react-three/fiber';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import type { ScreenWallTileConfig } from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { boundingBox, tileView } from 'explorviz-frontend/src/utils/collaboration/screen-wall-projection';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, type LineSegments, MathUtils, PerspectiveCamera } from 'three';

/*
 * On the Host's normal view, the outline of what the Screen Wall shows, with
 * the Tile borders inside. The Host's FOV spans the height of the reference
 * rectangle (the Host's own Tile, else the wall's bounding box; see
 * screen-wall-projection.ts), so that rectangle is as high as the view and
 * centered; the rest of the wall lies around it, partly off-screen. Hidden
 * while the camera renders a Tile (a view offset).
 */
export default function ScreenWallOutline() {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  const screenWall = state?.screenWall;
  const shown = !!room && state?.hostId === room.sessionId && !!screenWall?.active && !!screenWall.tiles.length;
  const tiles = screenWall?.tiles;
  const hostTile = (room && state?.participants[room.sessionId]?.tile) ?? -1;
  const geometry = useMemo(
    () => (shown && tiles ? outlineGeometry(tiles, hostTile) : undefined),
    [shown, tiles, hostTile]
  );
  const outline = useRef<LineSegments>(null);

  useFrame(({ camera }) => {
    const lines = outline.current;
    if (!lines) return;
    lines.visible = camera instanceof PerspectiveCamera && !camera.view?.enabled;
    if (!lines.visible) return;
    // Stay in front of the camera, between its near and far plane.
    const perspective = camera as PerspectiveCamera;
    const depth = Math.min(perspective.near * 1.5, (perspective.near + perspective.far) / 2);
    const halfHeight = depth * Math.tan(MathUtils.degToRad(perspective.fov) / 2);
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(lines.position, lines.quaternion, lines.scale);
    lines.scale.set(halfHeight, halfHeight, depth);
  });

  if (!geometry) return null;
  return (
    <lineSegments
      ref={outline}
      name="screen-wall-outline"
      geometry={geometry}
      frustumCulled={false}
      renderOrder={1000}
      raycast={() => null}
    >
      <lineBasicMaterial color="#ff8c00" depthTest={false} depthWrite={false} transparent />
    </lineSegments>
  );
}

/**
 * The bounding box and each Tile as rectangles at z = -1, with the reference
 * rectangle's height spanning y from -1 to 1 and its width centered on x = 0.
 */
function outlineGeometry(tiles: ScreenWallTileConfig[], hostTile: number) {
  const views = tiles.map((_, index) => tileView(tiles, index, hostTile));
  const { fullWidth, fullHeight } = views[0];
  const scale = 2 / fullHeight;
  const rectangles = [boundingBox(views), ...views];
  const vertices = rectangles.flatMap(({ x, y, width, height }) => {
    const left = x * scale - (fullWidth * scale) / 2;
    const right = left + width * scale;
    const top = 1 - y * scale;
    const bottom = top - height * scale;
    const corners = [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ];
    return corners.flatMap((corner, i) => [...corner, -1, ...corners[(i + 1) % 4], -1]);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  return geometry;
}
