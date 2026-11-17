import { useOwnTileIndex } from 'explorviz-frontend/src/utils/collaboration/screen-wall-tile';
import { useMemo } from 'react';
import { type Camera, PerspectiveCamera } from 'three';
import {
  type ScreenWallTileConfig,
  type TileRectangle,
  tileRectangle,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';

/*
 * The projection of a Tile. The Host's FOV spans the height of a reference
 * rectangle: the Host's own Tile if the Host is one (so the Host's Tile shows
 * exactly the Host's view and the other Tiles extend it, as extended screens
 * do), else the Screen Wall's bounding box (the wall shows the Host's view,
 * enlarged). Each Tile renders its own rectangle of that frustum, which may
 * lie outside the reference rectangle. Everything is in centimeters on the wall.
 */

/** The arguments of `PerspectiveCamera.setViewOffset` for one Tile, in cm. */
export type TileView = {
  /** The size of the reference rectangle, whose height the Host's FOV spans. */
  fullWidth: number;
  fullHeight: number;
  /** The Tile's top-left corner, from the top-left of the reference rectangle (may be negative). */
  x: number;
  y: number;
  /** The Tile's size. */
  width: number;
  height: number;
};

/**
 * The view of Tile `index` (0-based, as in `screenWall.tiles`) relative to the
 * reference rectangle: the Host's Tile `hostTile`, or the bounding box if the
 * Host has no Tile (-1).
 */
export function tileView(tiles: ScreenWallTileConfig[], index: number, hostTile: number): TileView {
  const rectangles = tiles.map(tileRectangle);
  const reference = hostTile >= 0 && hostTile < rectangles.length ? rectangles[hostTile] : boundingBox(rectangles);
  const own = rectangles[index];
  return {
    fullWidth: reference.width,
    fullHeight: reference.height,
    x: own.x - reference.x,
    y: own.y - reference.y,
    width: own.width,
    height: own.height,
  };
}

/** The smallest rectangle around these (at least one) rectangles. */
export function boundingBox(rectangles: TileRectangle[]): TileRectangle {
  const left = Math.min(...rectangles.map((r) => r.x));
  const top = Math.min(...rectangles.map((r) => r.y));
  const right = Math.max(...rectangles.map((r) => r.x + r.width));
  const bottom = Math.max(...rectangles.map((r) => r.y + r.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * The vertical FOV in degrees of a perspective projection (column-major, as
 * in a forwarded camera pose): its `elements[5]` is `1 / tan(fov / 2)`.
 */
export function fovOf(projection: ArrayLike<number>): number {
  return (2 * Math.atan(1 / projection[5]) * 180) / Math.PI;
}

/**
 * Makes the camera show only its Tile's part of the wall: `fov` spans the
 * height of the reference rectangle. Apply it every frame, since a resize of the
 * canvas resets the aspect; `restoreOwnProjection` undoes it.
 */
export function applyTileProjection(camera: PerspectiveCamera, fov: number, view: TileView) {
  camera.fov = fov;
  camera.aspect = view.fullWidth / view.fullHeight;
  camera.setViewOffset(view.fullWidth, view.fullHeight, view.x, view.y, view.width, view.height);
}

/** Undoes `applyTileProjection`: no view offset, your own FOV and your canvas's aspect. */
export function restoreOwnProjection(camera: PerspectiveCamera, fov: number, aspect: number) {
  camera.clearViewOffset();
  camera.fov = fov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

/**
 * The view of your own Tile while the Screen Wall is active and you are a
 * Tile (also as the Host), else undefined. Whether to apply it is up to the
 * caller: a Tile spectating the Host always does, the Host only in fullscreen.
 */
export function useOwnTileView(): TileView | undefined {
  const own = useOwnTileIndex();
  const tiles = own?.tiles;
  const index = own?.index;
  const hostTile = own?.hostTile ?? -1;
  return useMemo(
    () => (tiles && index !== undefined ? tileView(tiles, index, hostTile) : undefined),
    [tiles, index, hostTile]
  );
}

/**
 * The camera's projection as sent to spectators: a Host fullscreen on its own
 * Tile renders only part of the wall's frustum, yet spectators see the Host's
 * whole view, with its FOV at the canvas's own `aspect` and no view offset.
 * (The other Tiles take only the FOV from it.)
 */
export function projectionForSpectators(camera: Camera, aspect: number): number[] {
  if (!(camera instanceof PerspectiveCamera) || !camera.view?.enabled) return camera.projectionMatrix.toArray();
  const whole = unoffset.copy(camera, false);
  whole.clearViewOffset();
  whole.aspect = aspect;
  whole.updateProjectionMatrix();
  return whole.projectionMatrix.toArray();
}

const unoffset = new PerspectiveCamera();
