# Smooth Host camera on Tiles

Status: resolved
Blocked by: 02

Spec: `../spec.md` (section "Smoothness").

- While a Screen Wall is active, the Host sends its camera at 60 Hz (service limit raised accordingly).
- Tiles interpolate position (lerp) and orientation (slerp) between received poses, shown about 50 ms behind.

## Comments

- The service enforces no camera rate limit (Colyseus `maxMessagesPerSecond` is unset), so nothing to raise there; the contract gained `SCREEN_WALL_CAMERA_UPDATES_PER_SECOND = 60`, which the Host's sender uses while the wall is active.
- `smoothCameraOf` in `src/utils/collaboration/spectating.ts` keeps the last few poses with their arrival time and gives Tiles the pose 50 ms behind (lerp/slerp); other spectators still take the latest pose unchanged.
