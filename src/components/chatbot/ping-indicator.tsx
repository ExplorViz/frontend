interface PingIndicatorProps {
  x: number;
  y: number;
}

export function PingIndicator({ x, y }: PingIndicatorProps) {
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
