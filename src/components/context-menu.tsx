import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { Position2D } from 'explorviz-frontend/src/hooks/interaction-modifier';
import useLongPress from 'explorviz-frontend/src/hooks/useLongPress';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import * as EntityManipulation from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { removeAllHighlighting } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
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

  const handleLongPress = (pos: Position2D) => {
    setPosition(pos);
    reveal();
  };

  const { onTouchStart, onTouchMove, onTouchEnd } =
    useLongPress(handleLongPress);

  const resetView = async () => {
    useCameraControlsStore.getState().resetCamera();
  };

  const pingAnnotations = () => {
    const annotationHandlerStore = useAnnotationHandlerStore.getState();
    const allAnnotations = [
      ...annotationHandlerStore.annotationData,
      ...annotationHandlerStore.minimizedAnnotations,
    ];

    // Get entity IDs for all annotations
    const annotatedEntityIds = new Set<string>();
    allAnnotations.forEach((annotation) => {
      if (annotation.entityId) {
        annotatedEntityIds.add(annotation.entityId);
      }
    });

    // Ping each annotated model with green color
    annotatedEntityIds.forEach((entityId) => {
      pingByModelId(entityId, true, {
        color: 0x00ff00, // Green color
        durationMs: 3000,
        replay: false,
        removeOldPings: false,
      });
    });
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
    {
      title: 'Ping Annotations',
      action: pingAnnotations,
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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ width: '100%' }}
    >
      {visible && position && (
        <ul
          className="bg-white shadow border rounded-md w-40 select-none"
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
      className="context-menu-item select-none"
      style={{ cursor: 'pointer' }}
      onClick={onSelect}
    >
      {title}
    </li>
  );
}
