import { requestEntitySpans } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import { useEffect, useState } from 'react';
import { Accordion, Spinner } from 'react-bootstrap';
import SpanDetailsCard from './span-details-card';

interface SpansTabProps {
  telemetryKey: string;
}

export default function SpansTab({ telemetryKey }: SpansTabProps) {
  const [spans, setSpans] = useState<Span[] | null>(null);

  useEffect(() => {
    const fetchSpanData = async () => {
      try {
        const receivedSpans = await requestEntitySpans(telemetryKey);
        setSpans(receivedSpans);
      } catch (error) {
        console.error(error);
        setSpans([]);
      }
    };
    fetchSpanData();
  }, [telemetryKey]);

  return (
    <div className="mt-2 w-auto">
      {!spans ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading spans...</span>
        </div>
      ) : spans.length > 0 ? (
        <>
          <Accordion
            alwaysOpen={true}
            className="pe-1"
            style={{ width: '520px', minWidth: '520px' }}
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
                  <SpanDetailsCard span={span} />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </>
      ) : (
        <div className="text-center text-muted p-3">
          No spans found for this entity.
        </div>
      )}
    </div>
  );
}
