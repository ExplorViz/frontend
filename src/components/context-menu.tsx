import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { Position2D } from '../hooks/interaction-modifier';
import { removeAllHighlighting } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
export type ContextMenuItem = {
  title: string;
  action: () => void;
};

interface ContextMenuProps {
  children: ReactNode;
  enterVR: () => void;
}

export default function ContextMenu({ children, enterVR }: ContextMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position2D | null>(null);

  const mouseMoved = useRef<boolean>(false);

  const reveal = () => setVisible(true);

  const hide = () => setVisible(false);

  const resetView = async () => {
    useCameraControlsStore.getState().resetCamera();
  };

  const menuItems: ContextMenuItem[] = [
    { title: 'Reset View', action: resetView },
    {
      title: 'Open All Components',
      action: () => {
        EntityManipulation.openAllComponentsInLandscape();
      },
    },
    {
      title: 'Close All Components',
      action: () => {
        EntityManipulation.closeAllComponentsInLandscape();
      },
    },
    {
      title: useConfigurationStore.getState().isCommRendered
        ? 'Hide Communication'
        : 'Add Communication',
      action: () =>
        useConfigurationStore
          .getState()
          .setIsCommRendered(!useConfigurationStore.getState().isCommRendered),
    },
    {
      title: 'Clear Highlighting',
      action: () => {
        removeAllHighlighting();
      },
    },
    { title: 'Enter VR', action: enterVR },
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
