import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { CSSProperties } from 'react';
import { Badge } from 'react-bootstrap';

function spanKindToBsColor(spanKind: string): string {
  const colors: Record<string, string> = {
    client: 'primary',
    server: 'danger',
    internal: 'secondary',
    producer: 'warning',
    consumer: 'success',
  };

  return colors[spanKind.toLowerCase()] ?? 'secondary';
}

interface SpanKindBadgeProps {
  kind: string;
  pill?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Colored badge indicating the {@link Span.kind} of an OpenTelemetry span. */
export default function SpanKindBadge({
  kind,
  pill,
  className,
  style,
}: SpanKindBadgeProps) {
  return (
    <Badge
      bg={spanKindToBsColor(kind)}
      pill={pill}
      className={className}
      style={style}
    >
      <code className="text-light">{kind.toUpperCase()}</code>
    </Badge>
  );
}
