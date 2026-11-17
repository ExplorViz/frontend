# Screen Wall as Room state in the collaboration service

Status: resolved

Spec: `../spec.md` (sections "Room state and service", "Assignment").

- Contract: add the Screen Wall to the Room state (Tiles with name, resolution, diagonal, position in cm; `active` flag) and Host-only messages to set the configuration, apply it and stop it. No validation beyond the Host check.
- While active, make every Participant whose name matches a Tile (first-joined wins) spectate the Host; also on join, reconnect, rename and when the Host right passes on. Refuse `spectate` from Tile Participants while active. Stop clears it.
- An `identify` message (Host only) relayed to all Participants.
- Regenerate the frontend contract (`pnpm run contract:generate`).
- Tests next to the existing ones in `test/`.

## Comments

Done in collaboration-service `screen-wall` (2417141). Contract:

- State: `screenWall: { active: boolean; tiles: ScreenWallTile[] }` with `ScreenWallTile = { name, width, height (px), diagonal (in), x, y (cm, top-left) }`; Tile N is `tiles[N - 1]`. `Participant.tile` is the index of the Participant's Tile or -1 (first-joined wins; kept current whether active or not). While active, Tile Participants other than the Host have `spectating` = Host.
- Client messages (Host only): `screenWallApply { tiles: ScreenWallTileConfig[] }` (sets and activates), `screenWallStop {}` (keeps the Tiles), `screenWallIdentify {}`. Server message `screenWallIdentify {}` to everyone.
- Helper `tileRectangle(tile)` in the contract: the Tile's rectangle in cm (x, y, width, height) from diagonal and aspect ratio, for the sub-frustum.
- `spectate` from a Tile Participant is ignored while active. Applying ends the Host's own spectating if it would loop through a Tile. CONTRACT_VERSION unchanged (additive).
