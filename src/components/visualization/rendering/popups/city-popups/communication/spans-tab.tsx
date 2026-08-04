import { requestCommunicationSpans } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import React, { useEffect, useState } from 'react';
import { Accordion, Badge, Spinner, Table } from 'react-bootstrap';

interface SpansTabProps {
  communication: AggregatedCommunication;
}

export default function SpansTab({ communication }: SpansTabProps) {
  const [spans, setSpans] = useState<Span[] | null>(null);

  useEffect(() => {
    const fetchSpanData = async () => {
      try {
        setSpans(await requestCommunicationSpans(communication));
      } catch (error) {
        console.error(error);
        setSpans([]);
      }
    };
    fetchSpanData();
  }, [communication]);

  return (
    <div className="mt-2 w-auto">
      {!spans ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading spans...</span>
        </div>
      ) : spans.length > 0 ? (
        <Accordion
          alwaysOpen={true}
          className="pe-1"
          style={{ width: '520px' }}
        >
          {spans.map((span) => (
            <Accordion.Item
              className="mb-2 border rounded-0"
              key={span.spanId}
              eventKey={span.spanId}
            >
              <Accordion.Button className="border-0 rounded-0">
                <code className="text-dark">
                  <b>{span.spanId}</b>
                </code>
              </Accordion.Button>
              <Accordion.Body>
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
                    {(span.endUnixNano - span.startUnixNano) /
                      BigInt(1_000_000)}
                    ms
                  </dd>

                  {span.parentSpanId !== undefined && (
                    <>
                      <dt>Parent Span ID</dt>
                      <dd>
                        <code className="text-dark">{span.parentSpanId}</code>
                      </dd>
                    </>
                  )}

                  <dt>Span Attributes</dt>
                  <dd>
                    <AttributesTable attributes={span.spanAttributes} />
                  </dd>

                  <dt>Resource Attributes</dt>
                  <dd>
                    <AttributesTable attributes={span.resourceAttributes} />
                  </dd>
                </dl>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <div className="text-center text-muted p-3">
          Failed to fetch spans for this communication.
        </div>
      )}
    </div>
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
