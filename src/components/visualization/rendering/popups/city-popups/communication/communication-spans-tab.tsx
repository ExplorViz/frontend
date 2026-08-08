import { requestCommunicationSpans } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { CommSpans } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import { useEffect, useState } from 'react';
import { Accordion, Spinner } from 'react-bootstrap';
import SpanDetailsCard from '../span-details-card';

interface CommunicationSpansTabProps {
  communication: AggregatedCommunication;
}

export default function CommunicationSpansTab({
  communication,
}: CommunicationSpansTabProps) {
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
