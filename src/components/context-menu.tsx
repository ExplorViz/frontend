import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { Position2D } from '../hooks/interaction-modifier';

export type ContextMenuItem = {
  title: string;
  action: () => void;
};

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
}

export default function ContextMenu({ items, children }: ContextMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position2D | null>(null);

  const mouseMoved = useRef<boolean>(false);

  const reveal = () => setVisible(true);

  const hide = () => setVisible(false);

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
          {items.map((item) => (
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
