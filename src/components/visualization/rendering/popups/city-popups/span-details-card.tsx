import AttributesTable from 'explorviz-frontend/src/components/attributes-table';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { Card } from 'react-bootstrap';

interface SpanDetailsCardProps {
  span: Span;

  /** Callback to fire when the parent span ID is clicked */
  onParentIdClick?: (parentSpanId: string) => void;
}

export default function SpanDetailsCard({
  span,
  onParentIdClick,
}: SpanDetailsCardProps) {
  if (!span) {
    return 'Missing span details';
  }

  const parentSpanId = span.parentSpanId;

  return (
    <Card>
      <Card.Body>
        <dl>
          <dt>Name</dt>
          <dd>
            <small>
              <code>{span.name}</code>
            </small>
          </dd>

          <dt>Kind</dt>
          <dd>{span.kind}</dd>

          <dt>Duration</dt>
          <dd>
            {(span.endUnixNano - span.startUnixNano) / BigInt(1_000_000)}
            ms
          </dd>

          <dt>Parent Span ID</dt>
          <dd>
            {parentSpanId ? (
              <a href="#" onClick={() => onParentIdClick?.(parentSpanId)}>
                <code className="text-dark">{parentSpanId}</code>
              </a>
            ) : (
              'None (root span)'
            )}
          </dd>

          <dt>Span Attributes</dt>
          <dd>
            <AttributesTable attributes={span.spanAttributes} />
          </dd>

          <dt>Resource Attributes</dt>
          <dd>
            <AttributesTable attributes={span.resourceAttributes} />
          </dd>
        </dl>
      </Card.Body>
    </Card>
  );
}
