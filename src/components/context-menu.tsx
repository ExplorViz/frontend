import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useShallow } from 'zustand/react/shallow';
import { Position2D } from '../hooks/interaction-modifier';

export type ContextMenuItem = {
  title: string;
  action: () => void;
};

interface ContextMenuProps {
  children: ReactNode;
  switchToAR: () => void;
}

export default function ContextMenu({
  children,
  switchToAR,
}: ContextMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position2D | null>(null);

  const mouseMoved = useRef<boolean>(false);

  const reveal = () => setVisible(true);

  const hide = () => setVisible(false);

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      closeAllComponentsOfAllApplications:
        state.closeAllComponentsOfAllApplications,
      toggleCommunicationRendering: state.toggleCommunicationRendering,
    }))
  );

  const configurationState = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const userSettingsState = useUserSettingsStore(
    useShallow((state) => ({
      visualizationSettings: state.visualizationSettings,
      colors: state.colors,
    }))
  );

  const toastHandlerActions = useToastHandlerStore(
    useShallow((state) => ({
      showInfoToastMessage: state.showInfoToastMessage,
      showSuccessToastMessage: state.showSuccessToastMessage,
      showErrorToastMessage: state.showErrorToastMessage,
    }))
  );

  const resetView = async () => {
    toastHandlerActions.showErrorToastMessage(
      'Needs to be implemented',
      'TODO'
    );
    // cameraControls.current!.resetCameraFocusOn();
  };

  const menuItems: ContextMenuItem[] = [
    { title: 'Reset View', action: resetView },
    {
      title: 'Open All Components',
      action: () => {
        if (
          userSettingsState.visualizationSettings.autoOpenCloseFeature.value &&
          userSettingsState.visualizationSettings.semanticZoomState.value
        ) {
          toastHandlerActions.showErrorToastMessage(
            'Open All Components not useable when Semantic Zoom with auto open/close is enabled.'
          );
          return;
        }
        applicationRendererActions.openAllComponentsOfAllApplications();
      },
    },
    {
      title: 'Close All Components',
      action: () => {
        if (
          userSettingsState.visualizationSettings.autoOpenCloseFeature.value &&
          userSettingsState.visualizationSettings.semanticZoomState.value
        ) {
          toastHandlerActions.showErrorToastMessage(
            'Close All Components not useable when Semantic Zoom with auto open/close is enabled.'
          );
          return;
        }
        applicationRendererActions.closeAllComponentsOfAllApplications();
      },
    },
    {
      title: configurationState.isCommRendered
        ? 'Hide Communication'
        : 'Add Communication',
      action: applicationRendererActions.toggleCommunicationRendering,
    },
    { title: 'Enter AR', action: switchToAR },
  ];

  const onMouseUp = (event: React.MouseEvent) => {
    if (event.button === 2 && !mouseMoved.current) {
      event.preventDefault();
      setPosition({ x: event.pageX, y: event.pageY });
      reveal();
    }
  };

  const onMouseDown = (event: React.MouseEvent) => {
    if (event.button === 2) {
      mouseMoved.current = false;
    }
  };

  const onMouseMove = () => {
    mouseMoved.current = true;
  };

  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  useEffect(() => {
    document.addEventListener('click', hide);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('click', hide);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ width: '100%' }}
    >
      {visible && position && (
        <ul
          className="bg-white shadow border rounded-md w-40"
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x,
            listStyle: 'none',
            padding: 0,
            zIndex: '2000',
          }}
        >
          {menuItems.map((item) => (
            <ContextMenuItem
              key={item.title}
              title={item.title}
              onSelect={item.action}
            />
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

interface ContextMenuItemProps {
  title: string;
  onSelect: () => void;
}

function ContextMenuItem({ title, onSelect }: ContextMenuItemProps) {
  return (
    <li
      className="context-menu-item"
      style={{ cursor: 'pointer' }}
      onClick={onSelect}
    >
      {title}
    </li>
  );
}
