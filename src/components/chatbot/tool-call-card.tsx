import { useEffect, useState } from 'react';
import { SearchIcon, ToolsIcon } from '@primer/octicons-react';
import { Button } from 'react-bootstrap';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';

type Action =
  | 'highlight'
  | 'removeHighlight'
  | 'open'
  | 'close'
  | 'ping'
  | 'moveCamera'
  | 'resetCamera';
type Status = 'inProgress' | 'executing' | 'complete';

interface ToolCallCardProps {
  component?: {
    id?: string;
    name?: string;
  };
  status: Status;
  action?: Action;
}

export function ToolCallCard({ component, status, action }: ToolCallCardProps) {
  const message = getMessage(status, action);
  const displayComponent = component?.name || component?.id?.slice(0, 8);
  const hasId = Boolean(component?.id);

  return (
    <div className="tool-call-card">
      <Button
        variant="primary"
        disabled={!hasId}
        onClick={() => pingByModelId(component?.id!)}
      >
        {hasId ? <SearchIcon size={14} /> : <ToolsIcon size={14} />}
      </Button>
      {message}
      {displayComponent && ` ${displayComponent}`}
      {status !== 'complete' && <AnimatedEllipsis />}
    </div>
  );
}

function AnimatedEllipsis() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((count) => (count === 3 ? 1 : count + 1));
    }, 500);

    return () => clearInterval(interval);
  }, [setCount]);

  return '.'.repeat(count);
}

function getMessage(status: Status, action?: Action) {
  switch (status) {
    case 'inProgress':
    case 'executing':
      switch (action) {
        case 'highlight':
          return 'Highlighting';
        case 'removeHighlight':
          return 'Removing highlight from';
        case 'open':
          return 'Opening';
        case 'close':
          return 'Closing';
        case 'ping':
          return 'Pinging';
        case 'moveCamera':
          return 'Moving camera to';
        case 'resetCamera':
          return 'Resetting camera';
        default:
          return 'Tool call';
      }
    case 'complete':
      switch (action) {
        case 'highlight':
          return 'Highlighted';
        case 'removeHighlight':
          return 'Removed highlight from';
        case 'open':
          return 'Opened';
        case 'close':
          return 'Closed';
        case 'ping':
          return 'Pinged';
        case 'moveCamera':
          return 'Moved camera to';
        case 'resetCamera':
          return 'Reset camera';
        default:
          return 'Unknown tool call';
      }
  }
}
