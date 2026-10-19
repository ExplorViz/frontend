import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import AttributesTable from 'explorviz-frontend/src/components/attributes-table';
import SpanKindBadge from 'explorviz-frontend/src/components/badges/span-kind-badge';
import useSpanFetch from 'explorviz-frontend/src/hooks/fetch/useSpanFetch';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  highlightById,
  removeAllHighlighting,
} from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import {
  Span,
  TraceOverview,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { useCallback, useEffect, useState } from 'react';
import { Accordion, Button, Card, Spinner } from 'react-bootstrap';
import TraceTree from './trace-tree';

export interface SpanTree {
  data: Span;
  children: SpanTree[];
  parent?: SpanTree;
}

function toSpanTree(spans: Span[]) {
  const spanById = new Map<string, SpanTree>(
    spans.values().map((span) => [span.spanId, { data: span, children: [] }])
  );

  const roots: SpanTree[] = [];

  for (const span of spanById.values()) {
    const parent = span.data.parentSpanId
      ? spanById.get(span.data.parentSpanId)
      : undefined;

    if (parent) {
      span.parent = parent;
      parent.children.push(span);
    } else {
      roots.push(span);
    }
  }

  const sortRecursively = (spans: SpanTree[]): void => {
    spans.sort((a, b) => Number(a.data.startUnixNano - b.data.endUnixNano));

    for (const span of spans) {
      sortRecursively(span.children);
    }
  };

  sortRecursively(roots);

  return roots;
}

function flattenSpanTree(spanTree: SpanTree): Span[] {
  const result: Span[] = [spanTree.data];
  for (const child of spanTree.children) {
    result.push(...flattenSpanTree(child));
  }
  return result;
}

interface TraceDetailsProps {
  traceOverview: TraceOverview;
  onBackClick(): void;
}

export default function TraceDetails({
  traceOverview,
  onBackClick,
}: TraceDetailsProps) {
  const cities = useModelStore((state) => state.cities);
  const aggregatedCommunications = useModelStore(
    (state) => state.aggregatedCommunications
  );
  const telemetryKeyToEntityId = useModelStore(
    (state) => state.telemetryKeyToEntityId
  );
  const lookAtEntity = useCameraControlsStore((state) => state.lookAtEntity);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [spanData, setSpanData] = useState<{
    tree: SpanTree[];
    flat: Span[];
  } | null>(null);
  const [selectedSpanIndex, setSelectedSpanIndex] = useState<number | null>(
    null
  );

  const fetchSpans = useSpanFetch();

  const handleSpanChange = useCallback(
    (newSpan: Span, parent?: Span) => {
      const entityId = newSpan.telemetryKey
        ? telemetryKeyToEntityId.get(newSpan.telemetryKey)
        : Object.values(cities).find((c) => c.name === newSpan.serviceName)?.id;

      if (!entityId) {
        return;
      }

      lookAtEntity(entityId, 1);
      removeAllHighlighting();
      highlightById(entityId);

      if (!parent) {
        return;
      }

      const parentEntityid = parent.telemetryKey
        ? telemetryKeyToEntityId.get(parent.telemetryKey)
        : Object.values(cities).find((c) => c.name === parent.serviceName)?.id;

      const comm = Object.values(aggregatedCommunications).find(
        (c) =>
          c.sourceEntity.id === parentEntityid && c.targetEntity.id === entityId
      );
      if (comm) {
        highlightById(comm.id);
      }
    },
    [cities, telemetryKeyToEntityId, aggregatedCommunications, lookAtEntity]
  );

  const handleStepBackClick = () => {
    if (selectedSpanIndex === null || spanData === null) {
      return;
    }
    const newIndex = Math.min(
      Math.max(selectedSpanIndex - 1, 0),
      spanData.flat.length - 1
    );

    const newSpan = spanData.flat[newIndex];
    const parent = spanData.flat.find((s) => s.spanId === newSpan.parentSpanId);

    setSelectedSpanIndex(newIndex);
    handleSpanChange(newSpan, parent);
  };

  const handleStepForwardClick = () => {
    if (selectedSpanIndex === null || spanData === null) {
      return;
    }
    const newIndex = Math.min(selectedSpanIndex + 1, spanData.flat.length - 1);

    const newSpan = spanData.flat[newIndex];
    const parent = spanData.flat.find((s) => s.spanId === newSpan.parentSpanId);

    setSelectedSpanIndex(newIndex);
    handleSpanChange(newSpan, parent);
  };

  const handleSpanClick = (spanId: string) => {
    const newIndex = spanData?.flat.findIndex((s) => s.spanId === spanId);
    if (newIndex === undefined || spanData === null) {
      return;
    }

    const newSpan = spanData.flat[newIndex];
    const parent = spanData.flat.find((s) => s.spanId === newSpan.parentSpanId);

    setSelectedSpanIndex(newIndex);
    handleSpanChange(newSpan, parent);
  };

  useEffect(() => {
    const fetchAndUpdate = async () => {
      try {
        const receivedSpans = await fetchSpans({
          traceId: traceOverview.traceId,
          sortBy: 'oldest',
        });
        const tree = toSpanTree(receivedSpans);
        const flat = tree.flatMap(flattenSpanTree);
        setSpanData({ tree: tree, flat: flat });
        const selectedSpanIndex = receivedSpans.length > 0 ? 0 : null;
        setSelectedSpanIndex(selectedSpanIndex);
        if (selectedSpanIndex !== null) {
          handleSpanChange(receivedSpans[selectedSpanIndex]);
        }
      } catch (error) {
        console.error(error);
        showErrorToastMessage('Failed to fetch spans for trace');
        setSpanData({ tree: [], flat: [] });
        setSelectedSpanIndex(null);
      }
    };

    fetchAndUpdate();
  }, [traceOverview, fetchSpans, handleSpanChange, showErrorToastMessage]);

  const selectedSpan = spanData?.flat[selectedSpanIndex ?? 0];

  return (
    <div>
      <div className="d-flex justify-content-center align-items-center position-relative">
        <Button
          variant="outline-white"
          onClick={onBackClick}
          className="position-absolute start-0 px-0 py-0 border-0"
        >
          &larr;
        </Button>
        <h6 className="mt-1 mb-1">
          Trace: <code>{traceOverview.name}</code>
        </h6>
      </div>

      {spanData !== null &&
        spanData.flat.length > 0 &&
        selectedSpanIndex !== null && (
          <div className="d-flex justify-content-center align-items-center">
            <Button
              variant="white"
              size="sm"
              onClick={handleStepBackClick}
              disabled={selectedSpanIndex === 0}
              className="border-0"
            >
              <ChevronLeftIcon />
            </Button>
            <span className="user-select-none">
              {selectedSpanIndex + 1} / {traceOverview.spanCount}
            </span>
            <Button
              variant="white"
              size="sm"
              onClick={handleStepForwardClick}
              disabled={selectedSpanIndex === spanData.flat.length - 1}
              className="border-0"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        )}

      <div className="d-flex flex-column gap-2">
        {spanData !== null && spanData.flat.length > 0 && (
          <TraceTree
            spanTrees={spanData.tree}
            selectedSpanId={selectedSpan?.spanId}
            onSpanClick={handleSpanClick}
          />
        )}

        {selectedSpan ? (
          <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
            <Card>
              <Card.Body>
                <h6 className="mb-0">
                  <b>
                    {selectedSpan.serviceName}: {selectedSpan.name}{' '}
                    <SpanKindBadge kind={selectedSpan.kind} />
                  </b>
                </h6>

                <Accordion defaultActiveKey="span-attributes" alwaysOpen>
                  <Accordion.Item
                    eventKey="span-attributes"
                    className="border-0 py-1"
                  >
                    <Accordion.Button className="p-0 bg-transparent shadow-none">
                      Span Attributes
                    </Accordion.Button>
                    <Accordion.Body className="p-0">
                      <AttributesTable
                        attributes={selectedSpan.spanAttributes}
                      />
                    </Accordion.Body>
                  </Accordion.Item>

                  <Accordion.Item
                    eventKey="resource-attributes"
                    className="border-0 py-1"
                  >
                    <Accordion.Button className="p-0 bg-transparent shadow-none">
                      Resource Attributes
                    </Accordion.Button>
                    <Accordion.Body className="p-0">
                      <AttributesTable
                        attributes={selectedSpan.resourceAttributes}
                      />
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </Card.Body>
            </Card>
          </div>
        ) : spanData === null ? (
          <span>No span is selected.</span>
        ) : (
          <div className="d-flex justify-content-center">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
