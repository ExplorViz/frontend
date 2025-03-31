import { useEffect, useState, useRef } from 'react';

import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useARSettingsStore } from 'explorviz-frontend/src/stores/extended-reality/ar-settings';
import { Button } from 'react-bootstrap';
import ArPopupCoordinator from 'explorviz-frontend/src/components/extended-reality/visualization/rendering/popups/ar-popup-coordinator';
import PopupData from '../../../../visualization/rendering/popups/popup-data';

interface PopupWrapperArgs {
  popupData: PopupData;
  keepPopupOpen(id: number): void;
  setPopupPosition(id: number, posX: number, posY: number): void;
  closePopup(id: number): void;
  showApplication(applicationId: string): void;
  toggleHighlightById(id: string): void;
  openParents(entity: Node | Application | Package | Class): void;
}

export default function PopupWrapper(args: PopupWrapperArgs) {
  // Seems not to be used:
  const [isPinned, setIsPinned] = useState(false);

  const [panDeltaX, setPanDeltaX] = useState(0);
  const [panDeltaY, setPanDeltaY] = useState(0);

  const dragElementRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const dragElement = dragElementRef.current;
    initializePanListener(dragElement!);

    setupInitialPosition(dragElement!);

    if (useARSettingsStore.getState().stackPopups) {
      args.keepPopupOpen(+args.popupData.entity.id); // original param: args.popupData.id
    }
  });

  const initializePanListener = (element: HTMLElement) => {
    const mc = new Hammer(element);

    mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    // Keep track of pan distance since pan start
    mc.on('panstart', () => {
      keepPopupOpen();
      setPanDeltaX(0);
      setPanDeltaY(0);
    });

    mc.on('panleft panright panup pandown', (ev) => {
      // Calculate positional difference since last pan event
      const currentDeltaX = panDeltaX - ev.deltaX;
      const currentDeltaY = panDeltaY - ev.deltaY;

      handlePan(currentDeltaX, currentDeltaY);

      setPanDeltaX(ev.deltaX);
      setPanDeltaY(ev.deltaY);
    });
  };

  const keepPopupOpen = () => {
    if (!args.popupData.isPinned) {
      args.keepPopupOpen(+args.popupData.entity.id); // original param: args.popupData.id
    }
  };

  const closePopup = () => {
    args.closePopup(+args.popupData.entity.id); // original param: args.popupData.id
  };

  const setupInitialPosition = (popoverDiv: HTMLElement) => {
    const { popupData } = args;

    // Set to previously stored position
    if (popupData.isPinned) {
      popoverDiv.style.left = `${popupData.mouseX}px`; // original param: popupData.posX
      popoverDiv.style.top = `${popupData.mouseY}px`; // original param: popupData.posY
      return;
    }

    // Sorrounding div for position calculations
    const containerDiv = popoverDiv.parentElement as HTMLElement;

    const popoverHeight = popoverDiv.clientHeight;
    const popoverWidth = popoverDiv.clientWidth;

    const containerWidth = containerDiv.clientWidth;

    if (
      popoverHeight === undefined ||
      popoverWidth === undefined ||
      containerWidth === undefined
    ) {
      return;
    }

    const popupTopOffset = popoverHeight + 40;
    const popupLeftOffset = popoverWidth / 2;

    let popupTopPosition = containerDiv.clientHeight / 2 - popupTopOffset;
    let popupLeftPosition = containerDiv.clientWidth / 2 - popupLeftOffset;

    // Prevent popup positioning on top of rendering canvas =>
    // position under mouse cursor
    if (popupTopPosition < 0) {
      const approximateMouseHeight = 35;
      popupTopPosition = popupData.mouseY /*posY*/ + approximateMouseHeight;
    }

    // Prevent popup positioning right(outside) of rendering canvas =>
    // position at right edge of canvas
    if (popupLeftPosition + popoverWidth > containerWidth) {
      const extraPopupMarginFromAtBottom = 5;
      popupLeftPosition =
        containerWidth - popoverWidth - extraPopupMarginFromAtBottom;
    }

    // Prevent popup positioning left(outside) of rendering canvas =>
    // position at left edge of canvas
    if (popupLeftPosition < 0) {
      popupLeftPosition = 0;
    }

    // Set popup position
    /* eslint-disable no-param-reassign */
    popoverDiv.style.top = `${popupTopPosition}px`;
    popoverDiv.style.left = `${popupLeftPosition}px`;

    args.setPopupPosition(
      +args.popupData.entity.id, // original param: args.popupData.id
      popupLeftPosition,
      popupTopPosition
    );
  };

  const handlePan = (deltaX: number, deltaY: number) => {
    const localDivElement = dragElementRef.current!;
    const localArgs = args;

    function xPositionInsideWindow(minX: number, maxX: number) {
      return minX >= 0 && maxX <= window.innerWidth;
    }

    function yPositionInsideWindow(minY: number, maxY: number) {
      return minY >= 0 && maxY <= window.innerHeight;
    }

    function moveElement(xOffset: number, yOffset: number) {
      // Calculation of old and new coordinates
      const oldMinX = localDivElement.offsetLeft;
      const oldMaxX = oldMinX + localDivElement.clientWidth;
      const oldMinY = localDivElement.offsetTop;
      const oldMaxY = oldMinY + localDivElement.clientHeight;

      const newMinX = oldMinX - xOffset;
      const newMaxX = newMinX + localDivElement.clientWidth;
      const newMinY = oldMinY - yOffset;
      const newMaxY = newMinY + localDivElement.clientHeight;

      // Set the element's new position:
      if (
        !xPositionInsideWindow(oldMinX, oldMaxX) ||
        xPositionInsideWindow(newMinX, newMaxX)
      ) {
        localDivElement.style.left = `${newMinX}px`;
      }

      if (
        !yPositionInsideWindow(oldMinY, oldMaxY) ||
        yPositionInsideWindow(newMinY, newMaxY)
      ) {
        localDivElement.style.top = `${newMinY}px`;
      }

      localArgs.setPopupPosition(
        +localArgs.popupData.entity.id,
        newMinX,
        newMinY
      ); // original param: popupData.id
    }

    moveElement(deltaX, deltaY);
  };

  return (
    args.popupData && (
      <div
        ref={dragElementRef}
        id="popupWrapper"
        className="foreground"
        style={{ position: 'absolute', cursor: 'move' }}
      >
        <div className="d-flex">
          <Button
            title="ar-popup-close"
            variant="primary"
            onClick={closePopup}
            onTouchStart={closePopup}
          >
            X
          </Button>
        </div>
        <ArPopupCoordinator
          popupData={args.popupData}
          showApplication={args.showApplication}
          toggleHighlightById={args.toggleHighlightById}
          openParents={args.openParents}
        />
      </div>
    )
  );
}
