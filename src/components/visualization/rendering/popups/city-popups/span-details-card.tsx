import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import React from 'react';
import { Badge, Card, Table } from 'react-bootstrap';

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

function AttributesTable({
  attributes,
}: {
  attributes: Record<string, string>;
}) {
  return (
    <Table striped bordered hover size="sm" className="small w-auto text-break">
      <tbody>
        {Object.entries(attributes).map(([k, v]) => {
          // Filter out ExplorViz-specific attributes
          return k.startsWith('explorviz.') ? (
            <React.Fragment key={k} />
          ) : (
            <tr key={k}>
              <td>
                <Badge bg="secondary" text="light" pill>
                  {k}
                </Badge>
              </td>
              <td>
                <code className="text-secondary bg-secondary-subtle px-1 rounded-1">
                  {v}
                </code>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
