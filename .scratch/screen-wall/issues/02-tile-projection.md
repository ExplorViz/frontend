# Tile projection from the Screen Wall geometry

Status: resolved
Blocked by: 01

Spec: `../spec.md` (section "Projection").

- A pure function: Screen Wall configuration + Tile → `setViewOffset` arguments in cm (bounding box as full size, Tile rectangle as offset/size; diagonal + resolution give the physical size). Unit tests.
- While the own Participant is a Tile, the spectate camera controller applies only the Host's position and quaternion and builds the projection from the Host's FOV setting (sent with the pose or as Room state) with the Tile's view offset, every frame.
- Tiles take no input (camera controls disabled, no clicks/hovers).

## Comments

Built in `src/utils/collaboration/screen-wall-projection.ts`, wired into `spectate-camera-controller.tsx`. No contract change: the Host's FOV is read from the forwarded projection (`elements[5] = 1/tan(fov/2)`).

Reusable API (for 04: the Host's own Tile in fullscreen; 05: interpolated poses):

- `tileView(tiles, index): TileView` — pure; `setViewOffset` arguments in cm (`fullWidth/fullHeight` = bounding box, `x/y/width/height` = the Tile).
- `fovOf(projection): number` — vertical FOV in degrees from a column-major projection.
- `applyTileProjection(camera, fov, view)` — sets fov, the bounding box aspect and the view offset; call every frame. Undo: `clearViewOffset()` plus own fov and `size.width / size.height` aspect.
- `useOwnTileView(): TileView | undefined` — your Tile's view while the Screen Wall is active and you are a Tile (also the Host); the caller decides when to apply it.

The controller applies it only while spectating (non-Host Tiles): position and quaternion from the pose, projection from `applyTileProjection(camera, fovOf(pose.projection), view)`; 05 can replace the pose copy with an interpolated one. While a Tile it disables R3F pointer events (`setEvents({ enabled: false })`); camera controls are already disabled by spectating. 04 needs to disable controls/events itself for the Host. The test fake now mirrors `screenWall` and `Participant.tile` (`server.putScreenWallTiles(...)`).
