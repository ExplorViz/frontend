import { tileRectangle, type ScreenWallTileConfig } from './room-contract.generated';

/**
 * How near (in screen pixels) a dragged Tile's edge must come to another
 * Tile's edge to snap to it; the arrangement canvas converts it to cm at its scale.
 */
export const SNAP_DISTANCE_PX = 8;

/**
 * Where the Tile at `index` lands when dropped with its top-left corner at
 * (x, y) cm: each axis snaps, independently, so that one of its edges lies on
 * the nearest edge of another Tile within `snapDistance` cm.
 */
export function snapPosition(tiles: ScreenWallTileConfig[], index: number, x: number, y: number, snapDistance: number) {
  const moving = tileRectangle({ ...tiles[index], x, y });
  const others = tiles.filter((_, i) => i !== index).map(tileRectangle);
  return {
    x:
      x +
      snapOffset(
        [x, x + moving.width],
        others.flatMap((other) => [other.x, other.x + other.width]),
        snapDistance
      ),
    y:
      y +
      snapOffset(
        [y, y + moving.height],
        others.flatMap((other) => [other.y, other.y + other.height]),
        snapDistance
      ),
  };
}

/** The smallest shift that puts one of the edges on one of the targets, or 0 if none is near enough. */
function snapOffset(edges: number[], targets: number[], snapDistance: number) {
  let best = 0;
  let bestDistance = snapDistance;
  for (const edge of edges) {
    for (const target of targets) {
      const distance = Math.abs(target - edge);
      if (distance <= bestDistance) {
        best = target - edge;
        bestDistance = distance;
      }
    }
  }
  return best;
}
