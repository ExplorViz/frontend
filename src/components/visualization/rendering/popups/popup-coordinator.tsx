import React, { useEffect, useRef } from 'react';

import {
  CommentIcon,
  LocationIcon,
  PaintbrushIcon,
  PinIcon,
  ShareAndroidIcon,
  XIcon,
} from '@primer/octicons-react';
import ClazzPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/clazz/clazz-popup.tsx';
import CommunicationPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/communication/communication-popup.tsx';
import ComponentPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/component/component-popup.tsx';
import FoundationPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/foundation/foundation-popup.tsx';
import HtmlPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/html-popup';
import MethodPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/application-popups/method/method-popup.tsx';
import K8sPopup from 'explorviz-frontend/src/components/visualization/rendering/popups/k8s-popups/k8s-popup.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { Position2D } from 'explorviz-frontend/src/hooks/interaction-modifier';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  isApplication,
  isClass,
  isMethod,
  isNode,
  isPackage,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { isEntityAnnotated } from 'explorviz-frontend/src/utils/annotation-utils';

interface PopupCoordinatorProps {
  readonly popupData: PopupData;
  structureData: StructureLandscapeData;
  addAnnotationForPopup(popup: PopupData): void;
  pinPopup(popup: PopupData): void;
  removePopup(entityId: string): void;
  updatePopup(newData: PopupData): void;
  sharePopup(popup: PopupData): void;
  updateMeshReference(popup: PopupData): void;
  showApplication(appId: string): void;
  toggleHighlightById: (modelId: string) => void;
}

export default function PopupCoordinator({
  popupData,
  pinPopup,
  removePopup,
  updatePopup,
  sharePopup,
  updateMeshReference,
  addAnnotationForPopup,
  showApplication,
  toggleHighlightById,
}: PopupCoordinatorProps) {
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const getColor = useCollaborationSessionStore((state) => state.getColor);
  const restructureMode = useLandscapeRestructureStore(
    (state) => state.restructureMode
  );

  const element = useRef<HTMLDivElement | null>(null);
  const lastMousePosition = useRef<Position2D>({ x: 0, y: 0 });

  const sharedByColor = popupData.sharedBy ? getColor(popupData.sharedBy) : '';
  const entityType = getEntityType(popupData);

  const vizStore = useVisualizationStore();

  const onPointerOver = () => {
    updatePopup({ ...popupData, hovered: true });

    const entity = popupData.entity;
    vizStore.actions.setHoveredEntityId(entity.id);
  };

  const onPointerOut = () => {
    updatePopup({ ...popupData, hovered: false });
    vizStore.actions.setHoveredEntityId(null);
  };

  useEffect(() => {
    updatePopup({
      ...popupData,
      hovered: vizStore.hoveredEntityId === popupData.entity.id,
    });
  }, [vizStore.hoveredEntityId]);

  const highlight = () => {
    const entity = popupData.entity;

    const wasHighlighted = vizStore.highlightedEntityIds.has(entity.id);
    vizStore.actions.setHighlightedEntityId(entity.id, !wasHighlighted);
  };

  const elementDrag = (event: MouseEvent) => {
    event.preventDefault();
    // Calculate delta of cursor position:
    const diffX = lastMousePosition.current.x - event.clientX;
    const diffY = lastMousePosition.current.y - event.clientY;

    // Store latest mouse position for next delta calculation
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;

    if (!element.current) {
      console.error('Cannot update popup position: Div ref is not assigned');
      return;
    }

    if (!element.current.parentElement) {
      console.error(
        'Cannot update popup position: Parent element is not accessible'
      );
    }

    // Set the element's new position:
    const containerDiv = element.current.parentElement as HTMLElement;

    const popoverHeight = element.current.clientHeight;
    const popoverWidth = element.current.clientWidth;

    let newPositionX = element.current.offsetLeft - diffX;
    let newPositionY = element.current.offsetTop - diffY;

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
    updatePopup({
      ...popupData,
      mouseX: newPositionX,
      mouseY: newPositionY,
    });

    element.current.style.top = `${newPositionY}px`;
    element.current.style.left = `${newPositionX}px`;
  };

  const closeDragElement = () => {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
  };

  const dragMouseDown = (event: React.MouseEvent) => {
    updatePopup({
      ...popupData,
      wasMoved: true,
    });

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
      className={`popover${popupData.wasMoved ? '' : ' no-user-select'}${popupData.hovered ? ' hovered' : ''}`}
      style={{
        position: 'absolute',
      }}
      onPointerDown={dragMouseDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      ref={element}
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
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Ping Entity</Tooltip>}
          >
            <Button
              variant="primary"
              onClick={() => {
                pingByModelId(popupData.entity.id as string);
              }}
            >
              <LocationIcon className="align-right" />
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
            isOnline() &&
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
              variant={
                isEntityAnnotated(popupData.entityId) ? 'success' : 'primary'
              }
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
              onClick={() => removePopup(popupData.entity.id as string)}
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
        />
      )}
      {entityType == 'k8s' && <K8sPopup data={popupData} />}
      {entityType == 'html' && <HtmlPopup data={popupData} />}
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
  if (popupData.entity instanceof ClassCommunication) {
    return 'classCommunication';
  }
  // TODO:
  // if (popupData.entity instanceof K8sDataModel) {
  //   return 'k8s';
  // }
  if ('htmlNode' in popupData.entity) {
    return 'html';
  }
  return '';
}
