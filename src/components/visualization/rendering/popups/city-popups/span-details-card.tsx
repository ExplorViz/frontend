import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import React from 'react';
import { Badge, Card, Table } from 'react-bootstrap';

export default function SpanDetailsCard({ span }: { span: Span }) {
  if (!span) {
    return 'Missing span details';
  }

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
            {span.parentSpanId ? (
              <a href="#">
                <code className="text-dark">{span.parentSpanId}</code>
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
