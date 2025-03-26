import React, { MutableRefObject, useEffect, useRef } from 'react';

import { useCollaborationSessionStore } from '../stores/collaboration/collaboration-session';
import { useLocalUserStore } from '../stores/collaboration/local-user';
import RemoteUser from 'react-lib/src/utils/collaboration/remote-user';
import { useMinimapStore } from '../stores/minimap-service';
import Raycaster from 'react-lib/src/utils/raycaster';
import { Object3D, Vector2 } from 'three';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

interface InteractionModifierEventCallbacks {
  onSingleClick?: (intersection: THREE.Intersection | null) => void;
  onDoubleClick?: (intersection: THREE.Intersection) => void;
  onMouseMove?: (
    intersection: THREE.Intersection | null,
    event: MouseEvent
  ) => void;
  onMouseStop?: (
    intersection: THREE.Intersection,
    mousePosition: Vector2
  ) => void;
  onMouseOut?: (event: PointerEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMousePing?(intersection: THREE.Intersection): void;
  onCtrlDown?: () => void;
  onCtrlUp?: () => void;
  onShiftDown?: () => void;
  onShiftUp?: () => void;
  onAltUp?: () => void;
  onAltDown?: () => void;
  onSpaceDown?: () => void;
  onPinch?(intersection: THREE.Intersection | null, delta: number): void;
  onRotate?(intersection: THREE.Intersection | null, delta: number): void;
  onPan?(intersection: THREE.Intersection | null, x: number, y: number): void;
}

export default function useInteractionModifier(
  canvas: MutableRefObject<HTMLCanvasElement | null>,
  objectsToRaycast: Object3D | Object3D[],
  camera: THREE.Camera,
  eventCallbacks?: InteractionModifierEventCallbacks,
  rendererResolutionMultiplier = 1
) {
  // MARK: Stores

  const minimapCamera = useLocalUserStore((state) => state.minimapCamera);
  const localUserActions = useLocalUserStore(
    useShallow((state) => ({ ping: state.ping }))
  );

  const makeFullsizeMinimap = useMinimapStore(
    (state) => state.makeFullsizeMinimap
  );
  const minimapActions = useMinimapStore(
    useShallow((state) => ({
      raycastForObjects: state.raycastForObjects,
      raycastForMarkers: state.raycastForMarkers,
      isMouseInsideMinimap: state.isMouseInsideMinimap,
      addZoomDelta: state.addZoomDelta,
      toggleFullsizeMinimap: state.toggleFullsizeMinimap,
      handleHit: state.handleHit,
    }))
  );

  const collaborationActions = useCollaborationSessionStore(
    useShallow((state) => ({
      getUserById: state.getUserById,
    }))
  );

  // MARK: Refs

  const raycaster = useRef<Raycaster>(new Raycaster(minimapCamera));
  const isMouseOnCanvas = useRef<boolean>(false);
  const timer = useRef<NodeJS.Timeout>();
  const longPressTimer = useRef<NodeJS.Timeout>();
  const mouseClickCounter = useRef<number>(0);
  const latestSingleClickTimestamp = useRef<number>(0);
  const latestPanTimestamp = useRef<number>(0);
  const pointers = useRef<PointerEvent[]>([]);
  const rotateStart = useRef<number>(0);
  const longPressTriggered = useRef<boolean>(false);
  const longPressStart = useRef<Vector2>(new Vector2());
  const longPressEnd = useRef<Vector2>(new Vector2());
  const longPressDelta = useRef<Vector2>(new Vector2());
  const panStart = useRef<Vector2>(new Vector2());
  const panEnd = useRef<Vector2>(new Vector2());
  const panDelta = useRef<Vector2>(new Vector2());
  const pinchStart = useRef<Vector2>(new Vector2());
  const pinchEnd = useRef<Vector2>(new Vector2());
  const pinchDelta = useRef<Vector2>(new Vector2());
  const pointerPositions = useRef<Map<number, Vector2>>(
    new Map<number, Vector2>()
  );
  const rotateSpeed = useRef<number>(2.0);
  const pinchSpeed = useRef<number>(1.0);
  const panSpeed = useRef<number>(1.0);
  const selectedObject = useRef<THREE.Intersection | null>(null);

  // MARK: Constants

  const DOUBLE_CLICK_TIME_MS = 500;
  const PAN_THRESHOLD = 0.75;

  const raycastObjects =
    objectsToRaycast instanceof Object3D
      ? [objectsToRaycast]
      : objectsToRaycast;

  // MARK: Effects

  useEffect(() => {
    if (!canvas.current) {
      console.error(
        'Canvas ref must be initialized before using interaction-modifier'
      );
      return;
    }

    raycaster.current.minimapCam = minimapCamera;

    // MARK: Event handlers

    const onPointerEnter = () => {
      isMouseOnCanvas.current = true;
      eventCallbacks?.onMouseEnter?.();
    };

    const onPointerOut = (event: PointerEvent) => {
      isMouseOnCanvas.current = false;
      eventCallbacks?.onMouseOut?.(event);
    };

    const keyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      const key = event.key;
      switch (key) {
        case 'Control':
          eventCallbacks?.onCtrlDown?.();
          break;
        case 'Shift':
          eventCallbacks?.onShiftDown?.();
          break;
        case 'Alt':
          eventCallbacks?.onAltDown?.();
          break;
        case ' ':
          eventCallbacks?.onSpaceDown?.();
          break;
      }
    };

    const keyUp = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;

      const key = event.key;
      switch (key) {
        case 'Control':
          eventCallbacks?.onCtrlUp?.();
          break;
        case 'Shift':
          eventCallbacks?.onShiftUp?.();
          break;
        case 'Alt':
          eventCallbacks?.onAltUp?.();
          break;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (
        event.timeStamp - latestSingleClickTimestamp.current >
        DOUBLE_CLICK_TIME_MS
      ) {
        mouseClickCounter.current = 0;
      }

      isMouseOnCanvas.current = true;

      if (event.pointerType === 'touch' && pointers.current.length === 2) {
        onTouchMove(event);
      } else if (pointers.current.length === 1) {
        handleMouseMovePan(event);
      } else if (makeFullsizeMinimap) {
        const intersectedViewObj = minimapActions.raycastForObjects(
          event,
          minimapCamera,
          raycastObjects
        );
        eventCallbacks?.onMouseMove?.(intersectedViewObj, event);
      } else {
        const intersectedViewObj = raycast(event);
        eventCallbacks?.onMouseMove?.(intersectedViewObj, event);
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (minimapActions.isMouseInsideMinimap(event)) {
        minimapActions.addZoomDelta(-event.deltaY / 1000);
      }
    };

    const onPointerStop = (customEvent: CustomEvent<MouseStopEvent>) => {
      if (pointers.current.length > 0) {
        return;
      }
      const event = customEvent.detail.srcEvent;

      const intersectedViewObj = raycast(event);
      if (intersectedViewObj) {
        const mousePosition = new Vector2(event.clientX, event.clientY);
        eventCallbacks?.onMouseStop?.(intersectedViewObj, mousePosition);
      }
    };

    const onClickEventSingleClickUp = (event: PointerEvent) => {
      const intersectedViewObj = raycast(event);

      if (event.button === 1) {
        ping(intersectedViewObj);
      } else if (
        event.button === 0 &&
        pointers.current.length === 1 &&
        !longPressTriggered.current &&
        event.timeStamp - latestPanTimestamp.current > 200
      ) {
        onLeftClick(event, intersectedViewObj);
      } else if (
        event.button === 2 &&
        pointers.current.length === 1 &&
        event.timeStamp - latestPanTimestamp.current > 200
      ) {
        dispatchOpenMenuEvent(event);
      }
    };

    const dispatchOpenMenuEvent = (event: MouseEvent) => {
      const evt = new CustomEvent<OpenMenuEvent>('openmenu', {
        detail: {
          srcEvent: event,
        },
        bubbles: true,
        cancelable: true,
      });
      event.stopPropagation();
      if (event.target) event.target.dispatchEvent(evt);
    };

    const dispatchCloseMenuEvent = (event: MouseEvent) => {
      const evt = new CustomEvent<CloseMenuEvent>('closemenu', {
        detail: {
          srcEvent: event,
        },
        bubbles: true,
        cancelable: true,
      });
      if (event.target) window.dispatchEvent(evt);
    };

    const onLeftClick = (
      event: MouseEvent,
      intersectedViewObj: THREE.Intersection | null
    ) => {
      // check for click on Minimap
      let intersectedViewObjectCopy = intersectedViewObj;
      const isOnMinimap = minimapActions.isMouseInsideMinimap(event);
      const rayMarkers = minimapActions.raycastForMarkers(event);
      // if rayMarkers are present, it means that the click was on a marker
      if (rayMarkers) {
        handleMinimapOnLeftClick(isOnMinimap, rayMarkers);
        return;
      } else if (makeFullsizeMinimap && isOnMinimap) {
        const rayObjects = minimapActions.raycastForObjects(
          event,
          minimapCamera,
          raycastObjects
        );

        intersectedViewObjectCopy = rayObjects;
      } else if (makeFullsizeMinimap && !isOnMinimap) {
        minimapActions.toggleFullsizeMinimap(false);
        return;
      } else if (isOnMinimap) {
        handleMinimapOnLeftClick(isOnMinimap, rayMarkers);
        return;
      }
      // Treat shift + single click as double click
      if (event.shiftKey) {
        onDoubleClick(event);
        return;
      }
      mouseClickCounter.current += 1;

      // Counter could be zero when mouse is in motion or one when mouse has stopped
      if (mouseClickCounter.current === 1) {
        latestSingleClickTimestamp.current = event.timeStamp;
        timer.current = setTimeout(() => {
          mouseClickCounter.current = 0;
          eventCallbacks?.onSingleClick?.(intersectedViewObjectCopy);
        }, DOUBLE_CLICK_TIME_MS);
      }

      if (mouseClickCounter.current > 1) {
        mouseClickCounter.current = 0;
        onDoubleClick(event);
      }
    };

    /**
     * Handler Function if the click was on the minimap
     * @param isOnMinimap indicates if the click was on the minimap
     * @param ray indicates the object that was hit by the ray
     */
    const handleMinimapOnLeftClick = (
      isOnMinimap: boolean,
      ray: THREE.Intersection | null
    ) => {
      if (makeFullsizeMinimap && !isOnMinimap) {
        minimapActions.toggleFullsizeMinimap(false);
      } else if (isOnMinimap) {
        if (ray) {
          minimapActions.handleHit(
            collaborationActions.getUserById(ray.object.name) as RemoteUser
          );
        } else {
          minimapActions.toggleFullsizeMinimap(true);
        }
      }
    };

    /**
     * Handler Function for double click on minimap
     * @param event Mouse event of the click
     * @returns The object that was hit by the ray
     */
    const handleMinimapDoubleClick = (event: MouseEvent) => {
      if (minimapActions.isMouseInsideMinimap(event)) {
        return minimapActions.raycastForObjects(
          event,
          minimapCamera,
          raycastObjects
        );
      }
      return null;
    };

    const ping = (intersectedViewObj: THREE.Intersection | null) => {
      if (intersectedViewObj) {
        localUserActions.ping(
          intersectedViewObj.object,
          intersectedViewObj.point
        );
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      clearTimeout(timer.current);

      const minimapViewObj = handleMinimapDoubleClick(event);
      if (minimapViewObj) {
        eventCallbacks?.onDoubleClick?.(minimapViewObj);
      } else {
        const intersectedViewObj = raycast(event);
        if (intersectedViewObj) {
          eventCallbacks?.onDoubleClick?.(intersectedViewObj);
        }
      }
    };

    const raycast = (event: MouseEvent) => {
      if (!canvas.current) {
        console.error('Unable to raycast: Canvas ref is not set');
        return null;
      }

      const rect = canvas.current.getBoundingClientRect();
      const width = canvas.current.clientWidth / rendererResolutionMultiplier;
      const height = canvas.current.clientHeight / rendererResolutionMultiplier;

      const x = ((event.clientX - rect.left) / width) * 2 - 1;
      const y = -((event.clientY - rect.top) / height) * 2 + 1;

      const origin = new Vector2(x, y);
      return raycaster.current.raycasting(origin, camera, raycastObjects);
    };

    const createPointerStopEvent = () => {
      if (!canvas.current) {
        console.error(
          'Cannot create custom MouseStop event: Canvas ref not set'
        );
        return;
      }
      // Custom event for mousemovement end
      (function computeMouseMoveEvent(delay) {
        let timeout: NodeJS.Timeout;
        canvas.current.addEventListener('pointerdown', () => {
          // cancel to prevent click and stop event at same time
          clearTimeout(timeout);
        });
        canvas.current.addEventListener('pointermove', (evt: MouseEvent) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            const event = new CustomEvent<MouseStopEvent>('pointerstop', {
              detail: {
                srcEvent: evt,
              },
              bubbles: true,
              cancelable: true,
            });
            if (evt.target && isMouseOnCanvas) evt.target.dispatchEvent(event);
          }, delay);
        });
      })(300);
    };

    // from orbit controls
    const onPointerDown = (event: PointerEvent) => {
      clearTimeout(longPressTimer.current);
      longPressTriggered.current = false;
      if (pointers.current.length === 0) {
        // save touched object for pinch, rotate and pan callbacks
        selectedObject.current = raycast(event);
        canvas.current!.setPointerCapture(event.pointerId);
      }
      pointers.current.push(event);
      if (event.pointerType === 'touch' && pointers.current.length === 2) {
        handlePinchStart();
        handleRotateStart();
      } else if (event.button === 0 && pointers.current.length === 1) {
        dispatchCloseMenuEvent(event);
        handlePanStart(event);
        if (event.pointerType === 'touch') {
          longPressStart.current.set(event.clientX, event.clientY);
          longPressTimer.current = setTimeout(
            () => handleLongPress(event),
            500
          );
        }
      }
    };

    const handleLongPress = (event: PointerEvent) => {
      longPressTriggered.current = true;
      longPressDelta.current.subVectors(
        longPressEnd.current,
        longPressStart.current
      );
      if (selectedObject.current) {
        const mousePosition = new Vector2(event.clientX, event.clientY);
        eventCallbacks?.onMouseStop?.(selectedObject.current, mousePosition);
      } else if (
        longPressDelta.current.x < 35 &&
        longPressDelta.current.y < 35
      ) {
        dispatchOpenMenuEvent(event);
      }
    };

    const handlePinchStart = () => {
      const dx = pointers.current[0].pageX - pointers.current[1].pageX;
      const dy = pointers.current[0].pageY - pointers.current[1].pageY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      pinchStart.current.set(0, distance);
    };

    const handleRotateStart = () => {
      const dx = pointers.current[0].pageX - pointers.current[1].pageX;
      const dy = pointers.current[0].pageY - pointers.current[1].pageY;

      rotateStart.current = Math.atan2(dy, dx);
    };

    const handlePanStart = (event: PointerEvent) => {
      panStart.current.set(event.clientX, event.clientY);
    };

    const handleMouseMovePan = (event: PointerEvent) => {
      longPressEnd.current.set(event.clientX, event.clientY);
      panEnd.current.set(event.clientX, event.clientY);
      panDelta.current
        .subVectors(panEnd.current, panStart.current)
        .multiplyScalar(panSpeed.current);
      eventCallbacks?.onPan?.(
        selectedObject.current,
        panDelta.current.x,
        panDelta.current.y
      );
      panStart.current.copy(panEnd.current);

      // Register pan action to avoid unwanted triggering of click events
      if (panDelta.current.length() > PAN_THRESHOLD) {
        latestPanTimestamp.current = event.timeStamp;
      }
    };

    const trackPointer = (event: PointerEvent) => {
      let position = pointerPositions.current.get(event.pointerId);

      if (position === undefined) {
        position = new Vector2();
        pointerPositions.current.set(event.pointerId, position);
      }

      position.set(event.pageX, event.pageY);
    };

    const onTouchMove = (event: PointerEvent) => {
      if (pointers.current.length === 2) {
        trackPointer(event);
        handleTouchMovePinch(event);
        handleTouchMoveRotate();
      }
    };

    const handleTouchMovePinch = (event: PointerEvent) => {
      const position = getSecondPointerPosition(event);
      if (!position) {
        return;
      }

      const dx = event.pageX - position.x;
      const dy = event.pageY - position.y;

      const distance = Math.sqrt(dx * dx + dy * dy);

      pinchEnd.current.set(0, distance);

      pinchDelta.current.set(
        0,
        (pinchEnd.current.y / pinchStart.current.y) ** pinchSpeed.current
      );

      eventCallbacks?.onPinch?.(selectedObject.current, pinchDelta.current.y);

      pinchStart.current.copy(pinchEnd.current);
    };

    const handleTouchMoveRotate = () => {
      if (pointers.current.length === 2) {
        // use pointers always in the same order
        const pointer0 = pointerPositions.current.get(
          pointers.current[0].pointerId
        );
        const pointer1 = pointerPositions.current.get(
          pointers.current[1].pointerId
        );

        if (!pointer0 || !pointer1) {
          return;
        }

        const dx = pointer0.x - pointer1.x;
        const dy = pointer0.y - pointer1.y;

        const rotateEnd = Math.atan2(dy, dx);
        const angleChange =
          (rotateStart.current - rotateEnd) * rotateSpeed.current;

        eventCallbacks?.onRotate?.(selectedObject.current, angleChange);

        rotateStart.current = rotateEnd;
      }
    };

    const getSecondPointerPosition = (event: PointerEvent) => {
      const pointer =
        event.pointerId === pointers.current[0].pointerId
          ? pointers.current[1]
          : pointers.current[0];

      return pointerPositions.current.get(pointer.pointerId);
    };

    const onPointerUp = (event: PointerEvent) => {
      clearTimeout(longPressTimer.current);
      onClickEventSingleClickUp(event);
      removePointer(event);

      if (pointers.current.length === 0) {
        canvas.current!.releasePointerCapture(event.pointerId);
        selectedObject.current = null;
      }
    };

    const removePointer = (event: PointerEvent) => {
      pointerPositions.current.delete(event.pointerId);

      for (let i = 0; i < pointers.current.length; i++) {
        if (pointers.current[i].pointerId === event.pointerId) {
          pointers.current.splice(i, 1);
          return;
        }
      }
    };

    const onPointerCancel = (event: PointerEvent) => {
      removePointer(event);
    };

    canvas.current.addEventListener('pointerdown', onPointerDown);
    canvas.current.addEventListener('pointerup', onPointerUp);
    canvas.current.addEventListener('pointerenter', onPointerEnter);
    canvas.current.addEventListener('pointerout', onPointerOut);
    canvas.current.addEventListener('pointercancel', onPointerCancel);
    canvas.current.addEventListener('pointermove', onPointerMove);
    canvas.current.addEventListener('wheel', onWheel);

    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    createPointerStopEvent();
    canvas.current.addEventListener(
      'pointerstop',
      onPointerStop as EventListener
    );


    return function cleanup() {
      if (canvas.current) {
        canvas.current.removeEventListener('pointerdown', onPointerDown);
        canvas.current.removeEventListener('pointerup', onPointerUp);
        canvas.current.removeEventListener('pointerenter', onPointerEnter);
        canvas.current.removeEventListener('pointerout', onPointerOut);
        canvas.current.removeEventListener('pointercancel', onPointerCancel);
        canvas.current.removeEventListener('pointermove', onPointerMove);
        canvas.current.removeEventListener(
          'pointerstop',
          onPointerStop as EventListener
        );
        canvas.current.removeEventListener('wheel', onWheel);
      }
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
    };
  }, [camera, objectsToRaycast, minimapCamera, makeFullsizeMinimap]);
}


// MARK: Types

export type Position2D = {
  x: number;
  y: number;
};

type MouseStopEvent = {
  srcEvent: MouseEvent;
};
type OpenMenuEvent = {
  srcEvent: MouseEvent;
};
type CloseMenuEvent = {
  srcEvent: MouseEvent;
};
