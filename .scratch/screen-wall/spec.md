# Screen Wall

Status: ready-for-agent

Show one continuous view of the visualization across several monitors: each monitor is a browser window, every window is a Participant of the same Room, and together they extend the Host's view. Spans the frontend and the collaboration service.

Agreed in a grilling session on 2026-11-16. Keep the implementation slim: no sanity checks on the configuration, and features that do not work under an off-axis frustum are left alone (errors in them are accepted).

## Terms

- **Screen Wall**: a Room's arrangement of monitors that together show the Host's view, enlarged.
- **Tile**: one monitor of a Screen Wall, shown by one browser window, which is one Participant.

## Configuration (Host only, in the collaboration controls, opened by the Screen Wall button in their header)

- The Host creates Tiles, each with a **display name**, a **resolution** (typed, with presets 1920×1080, 2560×1440, 3840×2160 and a rotate button that swaps width and height) and a **diagonal** (inches). Nothing is reported by the browsers.
- Tiles may name Participants who have not joined yet.
- The Host drags the Tiles on an arrangement canvas in **physical units (cm)**. All Tiles lie in one plane; gaps (bezels) are allowed; dragged Tiles snap to the edges of others.
- **Identify**: every browser that shows a Tile displays its Tile number in large type for a few seconds.
- **Export / import** the whole configuration (names, resolutions, diagonals, positions) as JSON.
- Edits are a draft in the Host's browser until **Apply configuration**.

## Assignment

- A Tile belongs to the Participant with that display name (see ADR 0004). A Tile stays with its holder while they are present; a free Tile goes to the first-joined Participant with the name. The editor flags duplicate names. Renaming oneself to the name of a free Tile claims it.
- The Host is a Tile exactly when a Tile has the Host's name; there is no separate switch.
- A Participant with a Tile's name who joins, reconnects or reloads while the Screen Wall is active becomes that Tile at once, with no step of their own. Others stay normal Participants.

## Room state and service

- The configuration and whether it is active are Room state (ADR 0003). Only the Host may set, apply or stop it. No validation beyond the Host check.
- While active, every Tile Participant (other than the Host) spectates the Host through the existing spectating relay, and cannot start or stop spectating themselves.
- The Host right handed over, or the Host leaving: the Screen Wall stays active and follows the new Host's camera.
- A Landscape switch keeps the Screen Wall active.

## Applying

- Each Tile browser calls `requestFullscreen()` on the canvas as soon as it becomes a Tile. If the browser refuses (no user gesture), a full-window overlay "Click to show Tile N fullscreen" does it on one click.
- Tiles show the canvas only and take no input (no camera controls, no clicks or hovers).
- The magnifier, minimap, popups and in-scene HTML (`<Html transform>`) are not adapted.
- **Stop** ends fullscreen and spectating for every Tile; their own controls come back.
- Browser rendering only: a Tile cannot enter VR or AR.

## Projection

- A Tile takes **only the Host's position and orientation**, never the Host's projection matrix.
- If the Host is a Tile, the Host's FOV setting spans the height of the Host's own Tile: the Host's Tile shows exactly the Host's view, and the other Tiles extend it at the same scale, as extended screens of an operating system do. If the Host has no Tile, the FOV spans the height of the Screen Wall's bounding box (the wall shows the Host's view, enlarged).
- Each Tile renders its rectangle of that frustum via `setViewOffset` in physical units (full size = the reference rectangle in cm, i.e. the Host's Tile or the bounding box; offset/size = the Tile's rectangle, offsets may be negative), recomputed every frame so a resize cannot undo it.
- The Host's normal view (not fullscreen on a Tile) shows an outline of the part of the scene the Screen Wall shows.

## The Host as a Tile

- On Apply, the Host's browser enters canvas-only fullscreen on the Host's Tile (the click on Apply is the user gesture).
- Leaving fullscreen (Esc) does not affect other Tiles: the Host's window returns to the normal view with UI and the wall outline. A "Show my Tile" button enters fullscreen on the Tile again.

## Smoothness

- While a Screen Wall is active, the Host sends its camera at 60 Hz (instead of 30).
- Tiles interpolate between the received poses and show them about 50 ms behind.
- Timestamps and clock sync only if seams remain visible.

## Setup documentation

Fullscreen without a click needs one of: the Chrome/Edge policy `AutomaticFullscreenAllowedForUrls` for the ExplorViz origin, Firefox `full-screen-api.allow-trusted-requests-only = false`, or a kiosk-mode browser (`chrome --kiosk <room link>`). Tiles join through the room link; with login on, each machine logs in once.

## Prior art

The feature existed before: ARENA2 dome sync (2023, `lib/collaborative-mode/addon/services/projector-synchronization.ts`, removed in `9d0a9ae65`), fixed per-device projection matrices in spectating (2024, `fhd-monitors.json` in the old service), and a React port (removed in `571dd1897`). Those used hand-tuned matrices per `deviceId` and wrote the projection once; this design computes it from the geometry every frame.

## Changes after implementation

- 2026-11-16: The Host as a Tile is a Tile like any other, as with extended screens: the Host's FOV spans the Host's own Tile, not the whole wall (previously the Host's Tile showed only its slice of a view spread over the wall). Without a Host Tile, the FOV still spans the bounding box.
