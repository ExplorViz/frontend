import React, { useEffect, useRef } from 'react';

import Button from 'react-bootstrap/Button';
import {
  CommentIcon,
  PaintbrushIcon,
  PinIcon,
  ShareAndroidIcon,
  XIcon,
} from '@primer/octicons-react';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLandscapeRestructureStore } from 'react-lib/src/stores/landscape-restructure';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import {
  isApplication,
  isClass,
  isMethod,
  isNode,
  isPackage,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import ClazzCommuMeshDataModel from 'react-lib/src/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import K8sMesh from 'react-lib/src/view-objects/3d/k8s/k8s-mesh';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import FoundationPopup from 'react-lib/src/components/visualization/rendering/popups/application-popups/foundation/foundation-popup.tsx';
import ComponentPopup from 'react-lib/src/components/visualization/rendering/popups/application-popups/component/component-popup.tsx';
import ClazzPopup from 'react-lib/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup.tsx';
import MethodPopup from 'react-lib/src/components/visualization/rendering/popups/application-popups/method/method-popup.tsx';
import CommunicationPopup from 'react-lib/src/components/visualization/rendering/popups/application-popups/communication/communication-popup.tsx';
import K8sPopup from 'react-lib/src/components/visualization/rendering/popups/k8s-popups/k8s-popup.tsx';

// TODO import from interaction-modifier instead
type Position2D = {
  x: number;
  y: number;
};

interface PopupCoordinatorProps {
  addAnnotationForPopup(popup: PopupData): void;
  pinPopup(popup: PopupData): void;
  popupData: PopupData;
  removePopup(entityId: string): void;
  sharePopup(popup: PopupData): void;
  updateMeshReference(popup: PopupData): void;
  showApplication(): void;
  toggleHighlightById(): void;
  openParents(): void;
}

export default function PopupCoordinator({
  popupData,
  pinPopup,
  removePopup,
  sharePopup,
  updateMeshReference,
  addAnnotationForPopup,
  showApplication,
  toggleHighlightById,
  openParents,
}: PopupCoordinatorProps) {
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const getColor = useCollaborationSessionStore((state) => state.getColor);
  const toggleHighlight = useHighlightingStore(
    (state) => state.toggleHighlight
  );
  const restructureMode = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );

  const element = useRef<HTMLDivElement | null>(null);
  const lastMousePosition = useRef<Position2D>({ x: 0, y: 0 });

  const sharedByColor = popupData.sharedBy ? getColor(popupData.sharedBy) : '';
  const entityType = getEntityType(popupData);

  const onPointerOver = () => {
    popupData.mesh.applyHoverEffect();
    popupData.hovered = true;
  };

  const onPointerOut = () => {
    popupData.mesh.resetHoverEffect();
    popupData.hovered = false;
  };

  const highlight = () => {
    updateMeshReference(popupData);
    toggleHighlight(popupData.mesh, {
      sendMessage: true,
    });
  };

  const elementDrag = (event: MouseEvent) => {
    event.preventDefault();
    // Calculate delta of cursor position:
    const diffX = lastMousePosition.current.x - event.clientX;
    const diffY = lastMousePosition.current.y - event.clientY;

    // Store latest mouse position for next delta calulation
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;

    // Set the element's new position:
    const containerDiv = element.current!.parentElement as HTMLElement;

    const popoverHeight = element.current!.clientHeight;
    const popoverWidth = element.current!.clientWidth;

    let newPositionX = element.current!.offsetLeft - diffX;
    let newPositionY = element.current!.offsetTop - diffY;

    // Prevent popup position outside of rendering canvas in x-direction
    if (newPositionX < 0) {
      newPositionX = 0;
    } else if (
      containerDiv.clientWidth &&
      newPositionX > containerDiv.clientWidth - popoverWidth
    ) {
      newPositionX = containerDiv.clientWidth - popoverWidth;
    }

    // Prevent popup position outside of rendering canvas in y-direction
    if (newPositionY < 0) {
      newPositionY = 0;
    } else if (
      containerDiv.clientHeight &&
      newPositionY > containerDiv.clientHeight - popoverHeight
    ) {
      newPositionY = containerDiv.clientHeight - popoverHeight;
    }

    // Update stored popup position relative to new position
    popupData.mouseX -= element.current!.offsetLeft - newPositionX;
    popupData.mouseY -= element.current!.offsetTop - newPositionY;

    element.current!.style.top = `${newPositionY}px`;
    element.current!.style.left = `${newPositionX}px`;
  };

  const closeDragElement = () => {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
  };

  const dragMouseDown = (event: React.MouseEvent) => {
    popupData.wasMoved = true;

    //this line makes it impossible to interact with input fields
    //event.preventDefault();
    // get the mouse cursor position at startup:
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;
    document.onpointerup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = elementDrag;
  };

  useEffect(() => {
    if (!element.current || !popupData) {
      return;
    }

    const popoverDiv: HTMLDivElement = element.current;

    // Surrounding div for position calculations
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

    const popupTopOffset = popoverHeight + 30;
    const popupLeftOffset = popoverWidth / 2;

    let popupTopPosition = popupData.mouseY - popupTopOffset;
    let popupLeftPosition = popupData.mouseX - popupLeftOffset;

    // Prevent popup positioning on top of rendering canvas =>
    // position under mouse cursor
    if (popupTopPosition < 0) {
      const approximateMouseHeight = 35;
      popupTopPosition = popupData.mouseY + approximateMouseHeight;
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
    popoverDiv.style.top = `${popupTopPosition}px`;
    popoverDiv.style.left = `${popupLeftPosition}px`;
  }, []);

  return (
    <div
      className={`popover${popupData.wasMoved ? '' : ' no-user-select'}`}
      onPointerDown={dragMouseDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      ref={element}
      hover={popupData.hovered}
    >
      {popupData.wasMoved ? (
        <>
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={
              <Tooltip>
                {popupData.isPinned ? 'Popup is pinned' : 'Pin Popup'}
              </Tooltip>
            }
          >
            <Button
              variant={popupData.isPinned ? 'outline-secondary' : 'primary'}
              disabled={popupData.isPinned}
              onClick={() => {
                pinPopup(popupData);
              }}
            >
              <PinIcon className="align-right" />
            </Button>
          </OverlayTrigger>

          {popupData.sharedBy ? (
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={<Tooltip>Popup is shared</Tooltip>}
            >
              <Button variant="outline-secondary" disabled>
                <ShareAndroidIcon className="align-right" />
              </Button>
            </OverlayTrigger>
          ) : (
            isOnline &&
            popupData.isPinned && (
              <OverlayTrigger
                placement="top"
                trigger={['hover', 'focus']}
                overlay={<Tooltip>Share popup with other users.</Tooltip>}
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    sharePopup(popupData);
                  }}
                >
                  <ShareAndroidIcon className="align-middle" />
                </Button>
              </OverlayTrigger>
            )
          )}

          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Highlight</Tooltip>}
          >
            <Button variant="primary" onClick={highlight}>
              <PaintbrushIcon className="align-middle" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Annotate</Tooltip>}
          >
            <Button
              variant="primary"
              onClick={() => addAnnotationForPopup(popupData)}
            >
              <CommentIcon className="align-middle" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Close</Tooltip>}
          >
            <Button
              variant="outline-secondary"
              className="popup-close-button"
              onClick={() => removePopup(popupData.entity.id)}
            >
              <XIcon className="align-middle" />
            </Button>
          </OverlayTrigger>
        </>
      ) : (
        <Button variant="outline-secondary" size="sm" disabled>
          Drag with Mouse
        </Button>
      )}

      {entityType == 'application' && (
        <FoundationPopup
          restructureMode={restructureMode}
          popupData={popupData}
        />
      )}
      {entityType == 'package' && (
        <ComponentPopup
          restructureMode={restructureMode}
          popupData={popupData}
        />
      )}
      {entityType == 'class' && (
        <ClazzPopup restructureMode={restructureMode} popupData={popupData} />
      )}
      {entityType == 'method' && (
        <MethodPopup restructureMode={restructureMode} popupData={popupData} />
      )}
      {entityType == 'classCommunication' && (
        <CommunicationPopup
          restructureMode={restructureMode}
          popupData={popupData}
          showApplication={showApplication}
          toggleHighlightById={toggleHighlightById}
          openParents={openParents}
        />
      )}
      {entityType == 'k8s' && <K8sPopup data={popupData} />}
    </div>
  );
}

function getEntityType(popupData?: PopupData): string {
  if (!popupData) {
    return '';
  }
  if (isNode(popupData.entity)) {
    return 'node';
  }
  if (isApplication(popupData.entity)) {
    return 'application';
  }
  if (isClass(popupData.entity)) {
    return 'class';
  }
  if (isPackage(popupData.entity)) {
    return 'package';
  }
  if (isMethod(popupData.entity)) {
    return 'method';
  }
  if (popupData.entity instanceof ClazzCommuMeshDataModel) {
    return 'classCommunication';
  }
  if (popupData.mesh instanceof K8sMesh) {
    return 'k8s';
  }
  return '';
}
