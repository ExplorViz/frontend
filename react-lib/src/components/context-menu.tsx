import React, { ReactNode } from 'react';

import * as RadixContextMenu from '@radix-ui/react-context-menu';

export type ContextMenuItem = {
  title: string;
  action: (event: Event) => void;
};

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
}

export default function ContextMenu({ items, children }: ContextMenuProps) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.ContextMenuPortal>
        <RadixContextMenu.Content>
          {items.map((item) => {
            return (
              <RadixContextMenu.Item onSelect={item.action}>
                {item.title}
              </RadixContextMenu.Item>
            );
          })}
        </RadixContextMenu.Content>
      </RadixContextMenu.ContextMenuPortal>
    </RadixContextMenu.Root>
  );
}
