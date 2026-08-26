import { Position2D } from 'explorviz-frontend/src/types/pointer-types';

export function PingIndicator({ x, y }: Position2D) {
  return (
    <div
      className="ping-indicator"
      style={{
        left: x,
        top: y,
      }}
    />
  );
}
