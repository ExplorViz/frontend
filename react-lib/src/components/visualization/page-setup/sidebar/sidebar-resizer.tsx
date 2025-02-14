import React, { useEffect, useRef, useCallback } from 'react';
import { ArrowBothIcon } from '@primer/octicons-react';

interface SidebarArgs {
  readonly buttonName: string;
  readonly containerName: string;
  readonly sidebarName: string;
  readonly expandToRight: boolean;
}

export default function SidebarResizer({
  buttonName,
  containerName,
  sidebarName,
  expandToRight,
}: SidebarArgs) {
  const setSidebarWidth = useCallback(
    (widthInPercent: number) => {
      const sidebar = document.getElementById(sidebarName);

      if (sidebar && widthInPercent > 20) {
        sidebar.style.maxWidth = `${widthInPercent}%`;
        localStorage.setItem(
          sidebarName + 'WithInPercent',
          widthInPercent.toString()
        );
      }
    },
    [sidebarName]
  );

  const dragElement = useCallback(
    (resizeButton: HTMLElement) => {
      const handleDragInput = (targetX: number) => {
        let widthInPercent: number;

        if (expandToRight) {
          const buttonOffset = 30;
          widthInPercent = ((targetX + buttonOffset) / window.innerWidth) * 100;
        } else {
          const buttonOffset = 30;
          widthInPercent =
            100 - ((targetX - buttonOffset) / window.innerWidth) * 100;
        }

        setSidebarWidth(widthInPercent);
      };

      const cancelDragElement = () => {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchcancel = null;
        document.ontouchend = null;
        document.ontouchmove = null;
      };

      const elementMouseDrag = (e: MouseEvent) => {
        e.preventDefault();
        handleDragInput(e.clientX);
      };

      const elementTouchDrag = (e: TouchEvent) => {
        e.preventDefault();

        if (e.targetTouches.length < 1) {
          cancelDragElement();
        } else {
          const { clientX } = e.targetTouches[0];
          handleDragInput(clientX);
        }
      };

      const dragMouseDown = (e: MouseEvent) => {
        e.preventDefault();

        document.onmouseup = cancelDragElement;
        document.onmousemove = elementMouseDrag;
      };

      const dragTouchDown = (e: TouchEvent) => {
        e.preventDefault();

        if (e.targetTouches.length > 0) {
          document.ontouchcancel = cancelDragElement;
          document.ontouchend = cancelDragElement;
          document.ontouchmove = elementTouchDrag;
        }
      };

      resizeButton.onmousedown = dragMouseDown;
      resizeButton.ontouchstart = dragTouchDown;
    },
    [expandToRight, setSidebarWidth]
  );

  useEffect(() => {
    const dragButton = document.getElementById(buttonName);
    const buttonContainer = document.getElementById(containerName);

    if (dragButton) {
      dragElement(dragButton);
      if (buttonContainer) {
        buttonContainer.appendChild(dragButton);
      }
    }

    const sidebarWidthInPercent = Number(
      localStorage.getItem(sidebarName + 'WithInPercent')
    );

    if (typeof sidebarWidthInPercent === 'number') {
      setSidebarWidth(sidebarWidthInPercent);
    }

    // Cleanup function to remove event listeners (though they are on document)
    return () => {
      document.onmouseup = null;
      document.onmousemove = null;
      document.ontouchcancel = null;
      document.ontouchend = null;
      document.ontouchmove = null;
    };
  }, [buttonName, containerName, sidebarName, dragElement, setSidebarWidth]);

  return (
    <button
      id={buttonName}
      type="button"
      className="btn btn-light btn-outline-dark sidebar-button"
      title="Resize Sidebar"
      aria-label="Resize"
    >
      <ArrowBothIcon verticalAlign="middle" size="small" fill="#777" />
    </button>
  );
}
