# Screen Wall editor in the collaboration controls

Status: resolved
Blocked by: 01

Spec: `../spec.md` (section "Configuration").

- Host-only section in the collaboration controls: list of Tiles (display name, resolution with presets and rotate, diagonal), arrangement canvas in cm with drag and edge snapping, duplicate-name flag.
- Draft in the Host's browser; "Apply configuration" sends it; "Stop" ends it.
- Export / import JSON of the whole configuration.
- "Identify" button.

## Comments

- Built in `screen-wall-editor.tsx` (Tile list, buttons, export/import) and `screen-wall-arrangement.tsx` (SVG canvas in cm, pointer drag) next to `collaboration-controls.tsx`, shown to the Host only. Snapping is `snapPosition` in `src/utils/collaboration/screen-wall-arrangement.ts` (1 cm, per axis, edge to edge); larger gaps stay where dropped.
- The draft starts from the Room's configuration when the editor mounts (when you become Host) and is not overwritten afterwards. Export/import format: `{ "tiles": ScreenWallTileConfig[] }`, imported unchecked. Identify is always offered; Stop only while active.
- The fake service mirrors `Participant.tile` and `screenWall` (`putScreenWallTiles`, from ticket 02); it has no handlers for the `screenWall*` messages. Tests: `tests/screen-wall-editor.test.tsx`, `tests/screen-wall-arrangement.test.ts`.
