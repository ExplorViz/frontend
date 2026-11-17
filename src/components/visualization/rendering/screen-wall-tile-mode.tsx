import {
  enterCanvasFullscreen,
  exitCanvasFullscreen,
  useCanvasFullscreen,
} from 'explorviz-frontend/src/utils/canvas-fullscreen';
import { useOnScreenWallIdentify, useOwnTile } from 'explorviz-frontend/src/utils/collaboration/screen-wall-tile';
import { useCallback, useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';

/**
 * A Tile of the Screen Wall shows the canvas alone, fullscreen: on becoming a
 * Tile, and on stop it leaves fullscreen again. If the browser refuses
 * (no user gesture), one click on a full-window overlay does it. The Host
 * may leave fullscreen for the normal view and return with "Show my Tile".
 * On Identify, a Tile shows its number large for a few seconds.
 */
export default function ScreenWallTileMode() {
  const tile = useOwnTile();
  const isTile = !!tile;
  const fullscreen = useCanvasFullscreen();

  useEffect(() => {
    if (!isTile) return;
    void enterCanvasFullscreen();
    return exitCanvasFullscreen;
  }, [isTile]);

  const [identifying, setIdentifying] = useState(false);
  useOnScreenWallIdentify(
    useCallback(() => {
      if (isTile) setIdentifying(true);
    }, [isTile])
  );
  useEffect(() => {
    if (!identifying) return;
    const timeout = setTimeout(() => setIdentifying(false), IDENTIFY_MS);
    return () => clearTimeout(timeout);
  }, [identifying]);

  if (!tile) return null;
  return (
    <>
      {identifying && (
        // A popover sits in the top layer, so it shows above the fullscreen canvas.
        <div
          popover="manual"
          ref={(element) => element?.showPopover?.()}
          role="status"
          aria-label="Tile number"
          style={numberStyle}
        >
          {tile.number}
        </div>
      )}
      {!fullscreen &&
        (tile.isHost ? (
          <Button variant="primary" style={showMyTileStyle} onClick={() => void enterCanvasFullscreen()}>
            Show my Tile
          </Button>
        ) : (
          <button type="button" style={overlayStyle} onClick={() => void enterCanvasFullscreen()}>
            Click to show Tile {tile.number} fullscreen
          </button>
        ))}
    </>
  );
}

const IDENTIFY_MS = 4000;

const numberStyle: React.CSSProperties = {
  inset: 0,
  margin: 'auto',
  width: 'fit-content',
  height: 'fit-content',
  border: 'none',
  background: 'transparent',
  color: 'white',
  fontSize: '40vh',
  fontWeight: 'bold',
  lineHeight: 1,
  textShadow: '0 0 0.1em black',
  pointerEvents: 'none',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  border: 'none',
  background: 'rgba(0, 0, 0, 0.85)',
  color: 'white',
  fontSize: '2.5rem',
};

const showMyTileStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '1rem',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
};
