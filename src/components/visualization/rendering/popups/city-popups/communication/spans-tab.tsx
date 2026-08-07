import { requestCommunicationSpans } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  CommSpans,
  Span,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import React, { useEffect, useState } from 'react';
import { Accordion, Badge, Card, Spinner, Table } from 'react-bootstrap';

interface SpansTabProps {
  communication: AggregatedCommunication;
}

export default function SpansTab({ communication }: SpansTabProps) {
  const [commSpans, setCommSpans] = useState<CommSpans | null>(null);

  useEffect(() => {
    const fetchSpanData = async () => {
      try {
        setCommSpans(await requestCommunicationSpans(communication));
      } catch (error) {
        console.error(error);
        setCommSpans({ spans: {}, pairs: [] });
      }
    };
    fetchSpanData();
  }, [communication]);

  return (
    <div className="mt-2 w-auto">
      {!commSpans ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading spans...</span>
        </div>
      ) : commSpans.pairs.length > 0 ? (
        <Accordion
          alwaysOpen={true}
          className="pe-1"
          style={{ width: '520px', minWidth: '520px' }}
        >
          {commSpans.pairs.map((pair) => {
            const parentSpan = commSpans.spans[pair.parentSpanId];
            const childSpan = commSpans.spans[pair.childSpanId];

            if (!parentSpan || !childSpan) {
              console.error(`Missing span info for span pair ${pair}`);
            }

            return (
              <Accordion.Item
                className="mb-2 border rounded-0"
                key={`${pair.parentSpanId}-${pair.childSpanId}`}
                eventKey={`${pair.parentSpanId}-${pair.childSpanId}`}
              >
                <Accordion.Button className="border-0 rounded-0">
                  <code className="text-dark">
                    <b>
                      {pair.parentSpanId} &#10132; {pair.childSpanId}
                    </b>
                  </code>
                </Accordion.Button>
                <Accordion.Body>
                  <h6>
                    Parent span{' '}
                    <code className="text-dark">({pair.parentSpanId})</code>:
                  </h6>
                  <SpanDetailsCard span={parentSpan} />
                  <br />
                  <h6>
                    Child span{' '}
                    <code className="text-dark">({pair.childSpanId})</code>:
                  </h6>
                  <SpanDetailsCard span={childSpan} />
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      ) : (
        <div className="text-center text-muted p-3">
          Failed to fetch spans for this communication.
        </div>
      )}
    </div>
  );
}

function SpanDetailsCard({ span }: { span: Span }) {
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
            <React.Fragment key={k}></React.Fragment>
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
