import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { requestEntitySpans } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/trace';
import { useEffect, useRef, useState } from 'react';
import { Accordion, Spinner } from 'react-bootstrap';
import SpanDetailsCard from './span-details-card';

interface SpansTabProps {
  telemetryKey: string;
}

const PAGINATION_SIZE = 50;

export default function SpansTab({ telemetryKey }: SpansTabProps) {
  const showErrorToast = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [spans, setSpans] = useState<Span[] | null>(null);
  const [paginationOffset, setPaginationOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (allItemsLoaded) {
      return;
    }

    const fetchSpanData = async () => {
      try {
        const newSpans = await requestEntitySpans(
          telemetryKey,
          PAGINATION_SIZE,
          paginationOffset
        );
        setSpans((s) => (s ? [...s, ...newSpans] : newSpans));
        setIsLoading(false);
        if (newSpans.length < PAGINATION_SIZE) {
          setAllItemsLoaded(true);
        }
      } catch (error) {
        showErrorToast('An error occurred while fetching spans');
        console.error(error);
        setSpans([]);
      }
    };
    fetchSpanData();
  }, [telemetryKey, paginationOffset, allItemsLoaded, showErrorToast]);

  useEffect(() => {
    if (isLoading || allItemsLoaded) {
      return;
    }

    const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setPaginationOffset((o) => o + PAGINATION_SIZE);
        setIsLoading(true);
      }
    };

    const observer = new IntersectionObserver(intersectionCallback, {});
    const elem = loadMoreRef.current;
    if (elem) {
      observer.observe(elem);
    }

    return () => {
      if (elem) {
        observer.unobserve(elem);
      }
    };
  }, [loadMoreRef, isLoading, allItemsLoaded]);

  return (
    <div className="mt-2 w-auto">
      {spans && spans.length > 0 ? (
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
          <div ref={loadMoreRef} />
        </>
      ) : (
        !isLoading && (
          <div className="text-center text-muted p-3">
            No spans found for this entity.
          </div>
        )
      )}
      {isLoading && (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading spans...</span>
        </div>
      )}
    </div>
  );
}
