# Tile mode: fullscreen, canvas only, Host as a Tile

Status: resolved
Blocked by: 02

Spec: `../spec.md` (sections "Applying", "The Host as a Tile").

- On becoming a Tile: `requestFullscreen()` on the canvas (reuse `enterFullscreen` in `browser-rendering.tsx`); on refusal a one-click overlay "Click to show Tile N fullscreen". Canvas only, no UI.
- The Host: fullscreen on Apply; on leaving fullscreen back to the normal view; "Show my Tile" button to return.
- Stop: leave fullscreen and spectating, controls come back. No VR/AR while a Tile.
- Identify: show the Tile number large for a few seconds.

## Comments

Resolved on `screen-wall-04`. `screen-wall-tile-mode.tsx` (in `BrowserRendering`) requests canvas fullscreen on becoming a Tile (`src/utils/canvas-fullscreen.ts`, now also used by Settings), shows the one-click overlay when refused or after leaving fullscreen, exits on Stop, gives the Host "Show my Tile", and shows the Tile number on Identify in a top-layer popover (visible above the fullscreen canvas). `host-tile-projection.tsx` renders the Host's own Tile while it is fullscreen, using the Host's own FOV; the Host keeps its controls. The spectating send path forwards `projectionWithoutViewOffset(camera)`, so the other Tiles still get the Host's real FOV. No "Enter VR" and no XR rendering while a Tile. The Host's fullscreen on Apply comes from the state patch, within the Apply click's transient activation; if the browser refuses, "Show my Tile" is there.
