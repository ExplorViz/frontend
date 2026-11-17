import { SNAP_DISTANCE_PX, snapPosition } from 'explorviz-frontend/src/utils/collaboration/screen-wall-arrangement';
import { boundingBox } from 'explorviz-frontend/src/utils/collaboration/screen-wall-projection';
import {
  tileRectangle,
  type ScreenWallTileConfig,
  type TileRectangle,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useRef, useState, type PointerEvent } from 'react';

type Drag = {
  index: number;
  pointerId: number;
  /** Where the pointer and the Tile's corner were when the drag began. */
  startClient: { x: number; y: number };
  startTile: { x: number; y: number };
  /** Centimeters per screen pixel. */
  scale: number;
};

/**
 * The Tiles as they lie on the wall, in centimeters; dragging a Tile moves it
 * and snaps its edges to those of the others.
 */
export function ScreenWallArrangement({
  tiles,
  onMove,
}: {
  tiles: ScreenWallTileConfig[];
  onMove: (index: number, position: { x: number; y: number }) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | undefined>(undefined);
  // While dragging, the view stays as it was, so the Tile does not slide away under the pointer.
  const [frozenView, setFrozenView] = useState<TileRectangle | undefined>();
  const view = frozenView ?? viewOf(tiles.map(tileRectangle));

  const begin = (index: number, event: PointerEvent) => {
    const width = svg.current?.getBoundingClientRect().width;
    if (!width) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      index,
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startTile: { x: tiles[index].x, y: tiles[index].y },
      scale: view.width / width,
    };
    setFrozenView(view);
  };

  const move = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const x = current.startTile.x + (event.clientX - current.startClient.x) * current.scale;
    const y = current.startTile.y + (event.clientY - current.startClient.y) * current.scale;
    onMove(current.index, snapPosition(tiles, current.index, x, y, SNAP_DISTANCE_PX * current.scale));
  };

  const end = (event: PointerEvent) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = undefined;
    setFrozenView(undefined);
  };

  return (
    <svg
      ref={svg}
      role="group"
      aria-label="Arrangement of the Tiles (cm)"
      className="collab-wall-arrangement"
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {tiles.map((tile, index) => {
        const rectangle = tileRectangle(tile);
        const label = Math.min(rectangle.width, rectangle.height) * 0.5;
        return (
          <g
            // A Tile is its number: Tile N is the N-th entry.
            // eslint-disable-next-line react-x/no-array-index-key
            key={index}
            role="button"
            aria-label={`Tile ${index + 1}: ${tile.name}`}
            className="collab-wall-tile"
            onPointerDown={(event) => begin(index, event)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <title>{`${index + 1}: ${tile.name} (${Math.round(rectangle.width)} × ${Math.round(rectangle.height)} cm)`}</title>
            <rect x={rectangle.x} y={rectangle.y} width={rectangle.width} height={rectangle.height} />
            <text
              x={rectangle.x + rectangle.width / 2}
              y={rectangle.y + rectangle.height / 2}
              fontSize={label}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The bounding box of the Tiles with room around it to drag into. */
function viewOf(rectangles: TileRectangle[]): TileRectangle {
  if (rectangles.length === 0) return { x: 0, y: 0, width: 160, height: 90 };
  const bounds = boundingBox(rectangles);
  const margin = Math.max(bounds.width, bounds.height) * 0.25;
  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + 2 * margin,
    height: bounds.height + 2 * margin,
  };
}
