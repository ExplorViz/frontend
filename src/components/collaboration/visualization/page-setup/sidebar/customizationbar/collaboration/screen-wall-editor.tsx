import {
  AlertIcon,
  DeviceDesktopIcon,
  DownloadIcon,
  PlusIcon,
  SquareFillIcon,
  SyncIcon,
  TrashIcon,
  UploadIcon,
} from '@primer/octicons-react';
import { enterCanvasFullscreen } from 'explorviz-frontend/src/utils/canvas-fullscreen';
import { useRoomConnectionStore, useRoomState } from 'explorviz-frontend/src/utils/collaboration/room-connection';
import {
  tileRectangle,
  type ClientMessages,
  type ScreenWallTileConfig,
} from 'explorviz-frontend/src/utils/collaboration/room-contract.generated';
import { useState } from 'react';
import { ScreenWallArrangement } from './screen-wall-arrangement';

/**
 * The Host's editor for the Room's Screen Wall. The Tiles are a draft in this
 * browser until "Apply configuration" sends them; nothing is checked.
 */
export function ScreenWallEditor() {
  const room = useRoomConnectionStore((state) => state.room);
  const state = useRoomState();
  const screenWall = state?.screenWall;
  const names = Object.values(state?.participants ?? {}).map((participant) => participant.name);
  // The draft starts as the Room's configuration.
  const [tiles, setTiles] = useState<ScreenWallTileConfig[]>(() =>
    (screenWall?.tiles ?? []).map((tile) => ({ ...tile }))
  );

  const ownName = room ? state?.participants[room.sessionId]?.name : undefined;

  const apply = () => {
    room?.send('screenWallApply', { tiles } satisfies ClientMessages['screenWallApply']);
    // The click on Apply is the user gesture that lets the Host show its own Tile fullscreen.
    if (tiles.some((tile) => tile.name === ownName)) void enterCanvasFullscreen();
  };

  const change = (index: number, update: Partial<ScreenWallTileConfig>) =>
    setTiles((current) => current.map((tile, i) => (i === index ? { ...tile, ...update } : tile)));

  return (
    <section className="collab-group collab-screen-wall" aria-labelledby="collaboration-screen-wall">
      <div className="collab-group-header">
        <h6 className="collab-group-title" id="collaboration-screen-wall">
          Screen Wall
        </h6>
        {screenWall?.active && <span className="collab-chip">Active</span>}
        <span className="collab-group-actions">
          <button
            type="button"
            className="collab-icon-button"
            aria-label="Export configuration"
            title="Export configuration as JSON"
            onClick={() => exportConfiguration(tiles)}
          >
            <DownloadIcon size={14} />
          </button>
          <label className="collab-icon-button" title="Import configuration from JSON">
            <UploadIcon size={14} />
            <input
              type="file"
              aria-label="Import configuration"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) setTiles(JSON.parse(await file.text()).tiles);
              }}
            />
          </label>
        </span>
      </div>

      {tiles.length > 0 && (
        <ol className="collab-tiles" aria-label="Tiles">
          {tiles.map((tile, index) => (
            <TileRow
              // A Tile is its number: Tile N is the N-th entry.
              // eslint-disable-next-line react-x/no-array-index-key
              key={index}
              number={index + 1}
              tile={tile}
              duplicate={names.filter((name) => name === tile.name).length > 1}
              onChange={(update) => change(index, update)}
              onRemove={() => setTiles((current) => current.filter((_, i) => i !== index))}
            />
          ))}
        </ol>
      )}
      <button type="button" className="collab-button secondary" onClick={() => setTiles(addTile)}>
        <PlusIcon size={14} />
        Add Tile
      </button>

      {tiles.length > 0 && (
        <>
          <ScreenWallArrangement tiles={tiles} onMove={change} />
          <p className="collab-hint">Drag the Tiles as the monitors stand; edges snap to each other.</p>
        </>
      )}

      <div className="collab-screen-wall-actions">
        <button type="button" className="collab-button primary" onClick={apply}>
          Apply configuration
        </button>
        <button
          type="button"
          className="collab-button secondary"
          title="Every browser that shows a Tile shows its number for a few seconds"
          onClick={() => room?.send('screenWallIdentify', {} satisfies ClientMessages['screenWallIdentify'])}
        >
          <DeviceDesktopIcon size={14} />
          Identify
        </button>
        {screenWall?.active && (
          <button
            type="button"
            className="collab-button danger-outline"
            onClick={() => room?.send('screenWallStop', {} satisfies ClientMessages['screenWallStop'])}
          >
            <SquareFillIcon size={14} />
            Stop
          </button>
        )}
      </div>
    </section>
  );
}

/** Downloads the whole configuration (names, resolutions, diagonals, positions) as JSON. */
function exportConfiguration(tiles: ScreenWallTileConfig[]) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ tiles }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'screen-wall.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A new Tile: Full HD, 24 inches, right of the Tiles so far. */
function addTile(tiles: ScreenWallTileConfig[]): ScreenWallTileConfig[] {
  const right = Math.max(0, ...tiles.map((tile) => tileRectangle(tile)).map((r) => r.x + r.width));
  return [...tiles, { name: `Tile ${tiles.length + 1}`, width: 1920, height: 1080, diagonal: 24, x: right, y: 0 }];
}

const PRESETS = [
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
] as const;

function TileRow({
  number,
  tile,
  duplicate,
  onChange,
  onRemove,
}: {
  number: number;
  tile: ScreenWallTileConfig;
  /** Several Participants have the Tile's name; the one who joined first shows it. */
  duplicate: boolean;
  onChange: (update: Partial<ScreenWallTileConfig>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="collab-tile">
      <div className="collab-tile-line">
        <span className="collab-tile-number" aria-hidden>
          {number}
        </span>
        <input
          className="collab-input"
          aria-label={`Display name of Tile ${number}`}
          title="Display name of the Participant who shows this Tile"
          value={tile.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <button
          type="button"
          className="collab-icon-button danger"
          aria-label={`Remove Tile ${number}`}
          title="Remove"
          onClick={onRemove}
        >
          <TrashIcon size={14} />
        </button>
      </div>
      <div className="collab-tile-line">
        <NumberField
          label={`Width of Tile ${number} in pixels`}
          value={tile.width}
          onChange={(width) => onChange({ width })}
        />
        <span className="collab-tile-times">×</span>
        <NumberField
          label={`Height of Tile ${number} in pixels`}
          value={tile.height}
          onChange={(height) => onChange({ height })}
        />
        <button
          type="button"
          className="collab-icon-button"
          aria-label={`Rotate Tile ${number}`}
          title="Rotate (swap width and height)"
          onClick={() => onChange({ width: tile.height, height: tile.width })}
        >
          <SyncIcon size={14} />
        </button>
        <select
          className="collab-input collab-select"
          aria-label={`Resolution preset of Tile ${number}`}
          title="Resolution preset"
          value=""
          onChange={(event) => {
            const [width, height] = PRESETS[Number(event.target.value)];
            onChange({ width, height });
          }}
        >
          <option value="" disabled>
            Preset
          </option>
          {PRESETS.map(([width, height], index) => (
            <option key={`${width}x${height}`} value={index}>
              {width} × {height}
            </option>
          ))}
        </select>
      </div>
      <div className="collab-tile-line">
        <NumberField
          label={`Diagonal of Tile ${number} in inches`}
          value={tile.diagonal}
          onChange={(diagonal) => onChange({ diagonal })}
        />
        <span className="collab-tile-unit">inch diagonal</span>
      </div>
      {duplicate && (
        <p className="collab-hint collab-tile-warning">
          <AlertIcon size={12} /> Several Participants have this name; the one who joined first shows this Tile.
        </p>
      )}
    </li>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      className="collab-input"
      aria-label={label}
      title={label}
      value={Number.isFinite(value) ? value : ''}
      onChange={(event) => onChange(parseFloat(event.target.value))}
    />
  );
}
