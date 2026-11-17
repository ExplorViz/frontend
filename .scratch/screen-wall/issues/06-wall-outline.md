# Outline of the Screen Wall on the Host's normal view

Status: resolved
Blocked by: 02

Spec: `../spec.md` (section "Projection").

- While a Screen Wall is active and the Host is not fullscreen on a Tile, draw on the Host's view the outline of the part of the scene the Screen Wall shows (its bounding box frustum, and optionally the Tile borders).

## Comments

- Resolved on `screen-wall-06`: `src/components/visualization/rendering/screen-wall-outline.tsx` (mounted in `canvas-wrapper.tsx`) draws the wall's bounding box and Tile borders as screen-fixed lines in front of the Host's camera (height = the view, width = wall aspect / canvas aspect). Shown only to the Host while the Screen Wall is active and the camera has no enabled view offset, so it hides itself whenever the Host renders a Tile, however ticket 04 decides that. Tests: `tests/screen-wall-outline.test.tsx`.
