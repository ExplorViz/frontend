import { useEffect, useState } from 'react';
import { InfoIcon, SearchIcon, ToolsIcon } from '@primer/octicons-react';
import { Button } from 'react-bootstrap';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';

type Action =
  | 'highlight'
  | 'removeHighlight'
  | 'open'
  | 'close'
  | 'openToolsSidebar'
  | 'closeToolsSidebar'
  | 'openSettingsSidebar'
  | 'closeSettingsSidebar'
  | 'openToolsComponent'
  | 'closeToolsComponent'
  | 'openSettingsComponent'
  | 'closeSettingsComponent'
  | 'ping'
  | 'moveCamera'
  | 'resetCamera'
  | 'addApplication'
  | 'addClasses'
  | 'removeComponent'
  | 'undoEdit'
  | 'redoEdit'
  | 'screenshot'
  | 'clickOnScreen';
type Status = 'inProgress' | 'executing' | 'complete';

interface ToolCallCardProps {
  component?: {
    id?: string;
    name?: string;
    fqn?: string;
  };
  status: Status;
  action?: Action;
  showPopup?: boolean;
  errorMessage?: string;
  onClick?: () => void;
}

export function ToolCallCard({
  component,
  status,
  action,
  showPopup,
  errorMessage,
  onClick,
}: ToolCallCardProps) {
  const message = getMessage(status, action, errorMessage);
  const disabled = !component?.id && !onClick;
  const application = component?.id
    ? useModelStore.getState().getApplication(component?.id)
    : undefined;
  const pckg = component?.id
    ? useModelStore.getState().getComponent(component?.id)
    : undefined;
  const clazz = component?.id
    ? useModelStore.getState().getClass(component?.id)
    : undefined;
  const displayComponent =
    component?.name ||
    (application?.name && `application ${application.name}`) ||
    (pckg?.fqn && `package ${pckg.fqn}`) ||
    (clazz?.fqn && `class ${clazz.fqn}`) ||
    component?.id?.slice(0, 8);
  const { addPopup } = usePopupHandlerStore();

  return (
    <div className={`tool-call-card ${errorMessage ? 'error' : ''}`}>
      <Button
        variant={errorMessage ? 'danger' : 'primary'}
        disabled={disabled}
        onClick={
          onClick ||
          (() =>
            showPopup
              ? addPopup({ entityId: component!.id! })
              : pingByModelId(component?.id!))
        }
      >
        {disabled ? (
          <ToolsIcon size={14} />
        ) : showPopup ? (
          <InfoIcon size={14} />
        ) : (
          <SearchIcon size={14} />
        )}
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

function getMessage(status: Status, action?: Action, errorMessage?: string) {
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
        case 'openToolsSidebar':
          return 'Opening tools sidebar';
        case 'closeToolsSidebar':
          return 'Closing tools sidebar';
        case 'openSettingsSidebar':
          return 'Opening settings sidebar';
        case 'closeSettingsSidebar':
          return 'Closing settings sidebar';
        case 'openToolsComponent':
          return 'Opening tools component';
        case 'closeToolsComponent':
          return 'Closing tools component';
        case 'openSettingsComponent':
          return 'Opening settings component';
        case 'closeSettingsComponent':
          return 'Closing settings component';
        case 'ping':
          return 'Pinging';
        case 'moveCamera':
          return 'Moving camera to';
        case 'resetCamera':
          return 'Resetting camera';
        case 'addApplication':
          return 'Adding application';
        case 'addClasses':
          return 'Adding classes to';
        case 'removeComponent':
          return 'Removing component';
        case 'undoEdit':
          return 'Undoing edit';
        case 'redoEdit':
          return 'Redoing edit';
        case 'screenshot':
          return 'Taking screenshot';
        case 'clickOnScreen':
          return 'Clicking on screen at';
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
        case 'openToolsSidebar':
          return 'Opened tools sidebar';
        case 'closeToolsSidebar':
          return 'Closed tools sidebar';
        case 'openSettingsSidebar':
          return 'Opened settings sidebar';
        case 'closeSettingsSidebar':
          return 'Closed settings sidebar';
        case 'openToolsComponent':
          return 'Opened tools component';
        case 'closeToolsComponent':
          return 'Closed tools component';
        case 'openSettingsComponent':
          return 'Opened settings component';
        case 'closeSettingsComponent':
          return 'Closed settings component';
        case 'ping':
          return 'Pinged';
        case 'moveCamera':
          return 'Moved camera to';
        case 'resetCamera':
          return 'Reset camera';
        case 'addApplication':
          return 'Added application';
        case 'addClasses':
          return 'Added classes to';
        case 'removeComponent':
          return 'Removed component';
        case 'undoEdit':
          return 'Undid edit';
        case 'redoEdit':
          return 'Redid edit';
        case 'screenshot':
          if (errorMessage) {
            return `Failed to take screenshot: ${errorMessage}`;
          }
          return 'Took screenshot';
        case 'clickOnScreen':
          return 'Clicked on screen at';
        default:
          return 'Tool call';
      }
  }
}
