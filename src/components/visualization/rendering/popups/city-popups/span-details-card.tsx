import { SearchIcon } from '@primer/octicons-react';
import AttributesTable from 'explorviz-frontend/src/components/attributes-table';
import SpanKindBadge from 'explorviz-frontend/src/components/badges/span-kind-badge';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import { use } from 'react';
import { Button, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ToolbarContext } from '../../../page-setup/sidebar/toolbar/toolbar-context';

interface SpanDetailsCardProps {
  span: Span;
  onParentSpanIdClick?(parentSpanId: string): void;
}

/**
 * Detailed listing of properties for a specific OpenTelemetry span
 */
export default function SpanDetailsCard({
  span,
  onParentSpanIdClick,
}: SpanDetailsCardProps) {
  const city = useModelStore((state) =>
    Object.values(state.cities).find((c) => c.name === span.serviceName)
  );
  const entity = useModelStore((state) => {
    const id = state.telemetryKeyToEntityId.get(span.telemetryKey);
    return id ? state.buildings[id] : undefined;
  });
  const lookAtEntity = useCameraControlsStore((state) => state.lookAtEntity);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const toolbarContext = use(ToolbarContext);

  const parentSpanId = span.parentSpanId;

  const duration = span.endUnixNano - span.startUnixNano;
  const durationMs = duration / BigInt(1_000_000);
  const durationString = durationMs > 0n ? `${durationMs}ms` : `${duration}ns`;

  const handleServiceClick = () => {
    if (!city) {
      showErrorToastMessage('Service could not be found in visualization');
      return;
    }

    lookAtEntity(city.id);
    pingByModelId(city.id);
  };

  const handleEntityClick = () => {
    if (!entity) {
      showErrorToastMessage('Entity could not be found in visualization');
      return;
    }

    lookAtEntity(entity.id);
    pingByModelId(entity.id);
  };

  const handleSearchServiceClick = () => {
    toolbarContext.searchSpans({ serviceName: span.serviceName });
  };

  const handleSearchEntityClick = () => {
    toolbarContext.searchSpans({ telemetryKey: span.telemetryKey });
  };

  const handleTraceIdClick = () => {
    toolbarContext.searchSpans({ traceId: span.traceId });
  };

  return (
    <Card>
      <Card.Body>
        <dl>
          <dt>Name</dt>
          <dd>
            <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
              <samp>{span.name}</samp>
            </pre>
          </dd>

          <dt>Kind</dt>
          <dd>
            <SpanKindBadge kind={span.kind} />
          </dd>

          <dt>Duration</dt>
          <dd>
            <small>{durationString}</small>
          </dd>

          <dt>Span ID</dt>
          <dd>
            <small>
              <samp>{span.spanId}</samp>
            </small>
          </dd>

          <dt>Parent Span ID</dt>
          <dd>
            <small>
              {parentSpanId ? (
                onParentSpanIdClick ? (
                  <a href="#" onClick={() => onParentSpanIdClick(parentSpanId)}>
                    <samp>{span.parentSpanId}</samp>
                  </a>
                ) : (
                  <samp className="text-dark">{span.parentSpanId}</samp>
                )
              ) : (
                'None (root span)'
              )}
            </small>
          </dd>

          <dt>Trace ID</dt>
          <dd>
            <OverlayTrigger
              placement={'top'}
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Show all spans in this trace</Tooltip>}
            >
              <small>
                <a href="#" onClick={handleTraceIdClick}>
                  <samp>{span.traceId}</samp>
                </a>
              </small>
            </OverlayTrigger>
          </dd>

          {entity && (
            <>
              <dt>Entity</dt>
              <dd>
                <OverlayTrigger
                  placement={'top'}
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Highlight entity in visualization</Tooltip>}
                >
                  <small>
                    <a href="#" onClick={handleEntityClick}>
                      {entity.fqn ?? entity.name}
                    </a>
                  </small>
                </OverlayTrigger>

                <OverlayTrigger
                  placement={'top'}
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Search all spans for this entity</Tooltip>}
                >
                  <Button
                    variant="light"
                    size="sm"
                    className="ms-1"
                    onClick={handleSearchEntityClick}
                  >
                    <SearchIcon />
                  </Button>
                </OverlayTrigger>
              </dd>
            </>
          )}

          {span.serviceName && (
            <>
              <dt>Service Name</dt>
              <dd>
                <OverlayTrigger
                  placement={'top'}
                  trigger={['hover', 'focus']}
                  overlay={
                    <Tooltip>Highlight service in visualization</Tooltip>
                  }
                >
                  <small>
                    <a href="#" onClick={handleServiceClick}>
                      {span.serviceName}
                    </a>
                  </small>
                </OverlayTrigger>

                <OverlayTrigger
                  placement={'top'}
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Search all spans for this service</Tooltip>}
                >
                  <Button
                    variant="light"
                    size="sm"
                    className="ms-1"
                    onClick={handleSearchServiceClick}
                  >
                    <SearchIcon />
                  </Button>
                </OverlayTrigger>
              </dd>
            </>
          )}

          <dt>Instrumentation Scope</dt>
          <dd>
            <small>{span.instrumentationScope}</small>
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
