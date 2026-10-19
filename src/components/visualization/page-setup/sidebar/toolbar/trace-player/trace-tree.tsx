import {
  ArrowSwitchIcon,
  CodeIcon,
  DatabaseIcon,
  GlobeIcon,
  QuestionIcon,
} from '@primer/octicons-react';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  Building,
  City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { Card } from 'react-bootstrap';
import { SpanTree } from './trace-details';

interface TraceTreeProps {
  spanTrees: SpanTree[];
  selectedSpanId?: string;
  onSpanClick(spanId: string): void;
}

export default function TraceTree({
  spanTrees,
  selectedSpanId,
  onSpanClick,
}: TraceTreeProps) {
  return (
    <Card>
      <Card.Body className="overflow-auto" style={{ maxHeight: '200px' }}>
        {spanTrees.map((st) => {
          return (
            <SpanTreeItem
              key={st.data.spanId}
              spanTree={st}
              selectedSpanId={selectedSpanId}
              onClick={onSpanClick}
            />
          );
        })}
      </Card.Body>
    </Card>
  );
}

interface SpanTreeProps {
  spanTree: SpanTree;
  selectedSpanId?: string;
  depth?: number;
  onClick(spanId: string): void;
}

function SpanTreeItem({
  spanTree,
  selectedSpanId,
  depth = 0,
  onClick,
}: SpanTreeProps) {
  const buildings = useModelStore((state) => state.buildings);
  const cities = Object.values(useModelStore((state) => state.cities));
  const telemetryKeyToEntityId = useModelStore(
    (state) => state.telemetryKeyToEntityId
  );

  let entity: Building | City | undefined;
  const buildingId = telemetryKeyToEntityId.get(spanTree.data.telemetryKey);
  entity = buildingId ? buildings[buildingId] : undefined;

  if (entity === undefined) {
    entity = cities.find((c) => c.name === spanTree.data.serviceName);
  }

  let typeIcon;
  switch (entity?.type) {
    case 'code':
      typeIcon = <CodeIcon />;
      break;
    case 'database':
      typeIcon = <DatabaseIcon />;
      break;
    case 'http':
      typeIcon = <GlobeIcon />;
      break;
    case 'rpc':
      typeIcon = <ArrowSwitchIcon />;
      break;
    default:
      typeIcon = <QuestionIcon />;
  }

  const isSelected = selectedSpanId === spanTree.data.spanId;

  return (
    <>
      <div
        className={`d-flex align-items-center gap-1 px-2 rounded text-nowrap user-select-none ${isSelected ? 'text-primary' : ''}`}
        style={{
          marginLeft: `${1 * depth}em`,
          cursor: 'pointer',
          width: 'max-content',
          background: isSelected ? 'var(--bs-gray-200)' : undefined,
        }}
        onClick={() => onClick(spanTree.data.spanId)}
        ref={(elem) => {
          if (isSelected)
            elem?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
        }}
      >
        {typeIcon}
        <div>
          {spanTree.data.serviceName}{' '}
          <small className={`${isSelected ? undefined : 'text-muted'}`}>
            {spanTree.data.name}
          </small>
        </div>
      </div>

      {spanTree.children.map((child) => (
        <SpanTreeItem
          key={child.data.spanId}
          spanTree={child}
          selectedSpanId={selectedSpanId}
          depth={depth + 1}
          onClick={onClick}
        />
      ))}
    </>
  );
}
