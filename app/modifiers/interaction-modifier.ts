import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import RemoteUser from 'collaboration/utils/remote-user';
import debugLogger from 'ember-debug-logger';
import Modifier, { ArgsFor } from 'ember-modifier';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import UserSettings from 'explorviz-frontend/services/user-settings';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import { Object3D, Vector2 } from 'three';
import * as THREE from 'three';

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
type State = 'pinch' | 'none';

interface NamedArgs {
  mousePositionX: number;
  rendererResolutionMultiplier: number;
  camera: THREE.Camera;
  raycastObjects: Object3D | Object3D[];
  mouseEnter?(): void;
  mouseLeave?(): void;
  mouseOut?(event: PointerEvent): void;
  mouseMove?(intersection: THREE.Intersection | null, event: MouseEvent): void;
  mouseStop?(intersection: THREE.Intersection, mousePosition?: Vector2): void;
  singleClick?(intersection: THREE.Intersection | null): void;
  doubleClick?(intersection: THREE.Intersection): void;
  mousePing?(intersection: THREE.Intersection): void;
  pinch?(intersection: THREE.Intersection | null, delta: number): void;
  rotate?(intersection: THREE.Intersection | null, delta: number): void;
  pan?(intersection: THREE.Intersection | null, x: number, y: number): void;
  strgDown?(): void;
  strgUp?(): void;
  shiftDown?(): void;
  shiftUp?(): void;
  altUp?(): void;
  altDown?(): void;
  spaceDown?(): void;
}

interface InteractionModifierArgs {
  positional: [];
  named: NamedArgs;
}

function cleanup(instance: InteractionModifierModifier) {
  const { canvas } = instance;

  canvas.removeEventListener('pointerdown', instance.onPointerDown);
  canvas.removeEventListener('pointerup', instance.onPointerUp);
  canvas.removeEventListener('pointerenter', instance.onPointerEnter);
  canvas.removeEventListener('pointerout', instance.onPointerOut);
  canvas.removeEventListener('pointercancel', instance.onPointerCancel);
  canvas.removeEventListener('pointermove', instance.onPointerMove);
  canvas.removeEventListener('pointerstop', instance.onPointerStop);
  document.removeEventListener('keydown', instance.keyDown);
  document.removeEventListener('keyup', instance.keyUp);
}

export default class InteractionModifierModifier extends Modifier<InteractionModifierArgs> {
  // Used to determine if and which object was hit
  raycaster: Raycaster;

  debug = debugLogger('InteractionModifier');

  @service('collaboration-session')
  collaborativeSession!: CollaborationSession;

  @service('local-user')
  private localUser!: LocalUser;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('minimap-service')
  minimapService!: MinimapService;

  isMouseOnCanvas = false;

  pointer = new THREE.Vector2();

  timer!: NodeJS.Timeout;

  longPressTimer!: NodeJS.Timeout;

  mouseClickCounter: number = 0;

  didSetup = false;

  namedArgs!: NamedArgs;

  canvas!: HTMLCanvasElement;

  rendererResolutionMultiplier: number = 1;

  // Timestamps in milliseconds differentiate between click and pan actions
  latestSingleClickTimestamp = 0;
  latestPanTimestamp = 0;

  // 500ms is a default double click time, e.g. in Windows
  DOUBLE_CLICK_TIME_MS = 500;

  // Determines which euclidean distance in one tick is needed to count as a pan action
  PAN_THRESHOLD = 0.75;

  modify(element: any, _positionalArgs: any[], args: any) {
    this.namedArgs = args;
    if (args.rendererResolutionMultiplier) {
      this.rendererResolutionMultiplier = args.rendererResolutionMultiplier;
    }

    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof element}`,
      element instanceof HTMLCanvasElement
    );
    this.canvas = element;

    if (!this.didSetup) {
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointerup', this.onPointerUp);
      this.canvas.addEventListener('pointerenter', this.onPointerEnter);
      this.canvas.addEventListener('pointerout', this.onPointerOut);
      this.canvas.addEventListener('pointercancel', this.onPointerCancel);
      this.canvas.addEventListener('pointermove', this.onPointerMove);

      document.addEventListener('keydown', this.keyDown);
      document.addEventListener('keyup', this.keyUp);
      this.createPointerStopEvent();
      this.canvas.addEventListener('pointerstop', this.onPointerStop);

      registerDestructor(this, cleanup);
      this.didSetup = true;
    }
  }

  get raycastObjects(): Object3D | Object3D[] {
    const { raycastObjects } = this.namedArgs;
    return raycastObjects instanceof Object3D
      ? [raycastObjects]
      : raycastObjects;
  }

  get camera(): THREE.Camera {
    return this.namedArgs.camera;
  }

  constructor(owner: any, args: ArgsFor<InteractionModifierArgs>) {
    super(owner, args);
    this.raycaster = new Raycaster(this.localUser.minimapCamera);
  }

  @action
  onPointerEnter() {
    this.isMouseOnCanvas = true;

    this.namedArgs.mouseEnter?.();
  }

  @action onPointerOut(event: PointerEvent) {
    this.isMouseOnCanvas = false;

    this.namedArgs.mouseOut?.(event);
  }

  @action keyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;

    const key = event.key;
    switch (key) {
      case 'Control':
        this.namedArgs.strgDown?.();
        break;
      case 'Shift':
        this.namedArgs.shiftDown?.();
        break;
      case 'Alt':
        this.namedArgs.altDown?.();
        break;
      case ' ':
        this.namedArgs.spaceDown?.();
        break;
    }
  }

  @action keyUp(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;

    const key = event.key;
    switch (key) {
      case 'Control':
        this.namedArgs.strgUp?.();
        break;
      case 'Shift':
        this.namedArgs.shiftUp?.();
        break;
      case 'Alt':
        this.namedArgs.altUp?.();
        break;
    }
  }

  @action
  onPointerMove(event: PointerEvent) {
    if (
      event.timeStamp - this.latestSingleClickTimestamp >
      this.DOUBLE_CLICK_TIME_MS
    ) {
      this.mouseClickCounter = 0;
    }

    this.isMouseOnCanvas = true;

    if (event.pointerType === 'touch' && this.pointers.length === 2) {
      this.onTouchMove(event);
    } else if (this.pointers.length === 1) {
      this.handleMouseMovePan(event);
    } else if (this.minimapService.makeFullsizeMinimap) {
      const intersectedViewObj = this.minimapService.raycastForObjects(
        event,
        this.localUser.minimapCamera,
        this.raycastObjects
      );
      this.namedArgs.mouseMove?.(intersectedViewObj, event);
    } else {
      const intersectedViewObj = this.raycast(event);
      this.namedArgs.mouseMove?.(intersectedViewObj, event);
    }
  }

  @action
  onPointerStop(customEvent: CustomEvent<MouseStopEvent>) {
    if (this.pointers.length > 0) {
      return;
    }
    const event = customEvent.detail.srcEvent;

    const intersectedViewObj = this.raycast(event);
    if (intersectedViewObj) {
      const mousePosition = new Vector2(event.clientX, event.clientY);
      this.namedArgs.mouseStop?.(intersectedViewObj, mousePosition);
    }
  }

  @action
  onClickEventsingleClickUp(event: PointerEvent) {
    const intersectedViewObj = this.raycast(event);

    if (event.button === 1) {
      this.ping(intersectedViewObj);
    } else if (
      event.button === 0 &&
      this.pointers.length === 1 &&
      !this.longPressTriggered &&
      event.timeStamp - this.latestPanTimestamp > 200
    ) {
      this.onLeftClick(event, intersectedViewObj);
    } else if (
      event.button === 2 &&
      this.pointers.length === 1 &&
      event.timeStamp - this.latestPanTimestamp > 200
    ) {
      this.dispatchOpenMenuEvent(event);
    }
  }

  dispatchOpenMenuEvent(event: MouseEvent) {
    const evt = new CustomEvent<OpenMenuEvent>('openmenu', {
      detail: {
        srcEvent: event,
      },
      bubbles: true,
      cancelable: true,
    });
    event.stopPropagation();
    if (event.target) event.target.dispatchEvent(evt);
  }

  dispatchCloseMenuEvent(event: MouseEvent) {
    const evt = new CustomEvent<CloseMenuEvent>('closemenu', {
      detail: {
        srcEvent: event,
      },
      bubbles: true,
      cancelable: true,
    });
    if (event.target) window.dispatchEvent(evt);
  }

  @action
  onLeftClick(
    event: MouseEvent,
    intersectedViewObj: THREE.Intersection | null
  ) {
    // check for click on Minimap
    let intersectedViewObjectCopy = intersectedViewObj;
    const isOnMinimap = this.minimapService.isClickInsideMinimap(event);
    const rayMarkers = this.minimapService.raycastForMarkers(event);
    // if rayMarkers are present, it means that the click was on a marker
    if (rayMarkers) {
      this.handleMinimapOnLeftClick(isOnMinimap, rayMarkers);
      return;
    } else if (this.minimapService.makeFullsizeMinimap && isOnMinimap) {
      const rayObjects = this.minimapService.raycastForObjects(
        event,
        this.localUser.minimapCamera,
        this.raycastObjects
      );

      intersectedViewObjectCopy = rayObjects;
    } else if (this.minimapService.makeFullsizeMinimap && !isOnMinimap) {
      this.minimapService.toggleFullsizeMinimap(false);
      return;
    } else if (isOnMinimap) {
      this.handleMinimapOnLeftClick(isOnMinimap, rayMarkers);
      return;
    }
    // Treat shift + single click as double click
    if (event.shiftKey) {
      this.onDoubleClick(event);
      return;
    }
    this.mouseClickCounter++;

    // Counter could be zero when mouse is in motion or one when mouse has stopped
    if (this.mouseClickCounter === 1) {
      this.latestSingleClickTimestamp = event.timeStamp;
      this.timer = setTimeout(() => {
        this.mouseClickCounter = 0;
        this.namedArgs.singleClick?.(intersectedViewObjectCopy);
      }, this.DOUBLE_CLICK_TIME_MS);
    }

    if (this.mouseClickCounter > 1) {
      this.mouseClickCounter = 0;
      this.onDoubleClick(event);
    }
  }
  /**
   * Handler Function if the click was on the minimap
   * @param isOnMinimap indicates if the click was on the minimap
   * @param ray indicates the object that was hit by the ray
   */
  private handleMinimapOnLeftClick(
    isOnMinimap: boolean,
    ray: THREE.Intersection | null
  ) {
    if (this.minimapService.makeFullsizeMinimap && !isOnMinimap) {
      this.minimapService.toggleFullsizeMinimap(false);
    } else if (isOnMinimap) {
      if (ray) {
        this.minimapService.handleHit(
          this.collaborativeSession.getUserById(ray.object.name) as RemoteUser
        );
      } else {
        this.minimapService.toggleFullsizeMinimap(true);
      }
    }
  }
  /**
   * Handler Function for double click on minimap
   * @param event Mouse event of the click
   * @returns The object that was hit by the ray
   */
  private handleMinimapDoubleClick(event: MouseEvent) {
    if (this.minimapService.isClickInsideMinimap(event)) {
      return this.minimapService.raycastForObjects(
        event,
        this.localUser.minimapCamera,
        this.raycastObjects
      );
    }
    return null;
  }

  @action
  ping(intersectedViewObj: THREE.Intersection | null) {
    if (intersectedViewObj) {
      this.localUser.ping(intersectedViewObj.object, intersectedViewObj.point);
    }
  }

  @action
  onDoubleClick(event: MouseEvent) {
    clearTimeout(this.timer);

    const minimapViewObj = this.handleMinimapDoubleClick(event);
    if (minimapViewObj) {
      this.namedArgs.doubleClick?.(minimapViewObj);
    } else {
      const intersectedViewObj = this.raycast(event);
      if (intersectedViewObj) {
        this.namedArgs.doubleClick?.(intersectedViewObj);
      }
    }
  }

  raycast(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const width = this.canvas.clientWidth / this.rendererResolutionMultiplier;
    const height = this.canvas.clientHeight / this.rendererResolutionMultiplier;

    const x = ((event.x - rect.left) / width) * 2 - 1;
    const y = -((event.y - rect.top) / height) * 2 + 1;

    const origin = new Vector2(x, y);
    const possibleObjects =
      this.raycastObjects instanceof Object3D
        ? [this.raycastObjects]
        : this.raycastObjects;
    return this.raycaster.raycasting(origin, this.camera, possibleObjects);
  }

  createPointerStopEvent() {
    const self = this;

    // Custom event for mousemovement end
    (function computeMouseMoveEvent(delay) {
      let timeout: NodeJS.Timeout;
      self.canvas.addEventListener('pointerdown', () => {
        // cancel to prevent click and stop event at same time
        clearTimeout(timeout);
      });
      self.canvas.addEventListener('pointermove', (evt: MouseEvent) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const event = new CustomEvent<MouseStopEvent>('pointerstop', {
            detail: {
              srcEvent: evt,
            },
            bubbles: true,
            cancelable: true,
          });
          if (evt.target && self.isMouseOnCanvas)
            evt.target.dispatchEvent(event);
        }, delay);
      });
    })(300);
  }

  pointers: PointerEvent[] = [];

  rotateStart = 0;

  longPressTriggered = false;

  longPressStart = new Vector2();

  longPressEnd = new Vector2();

  longPressDelta = new Vector2();

  panStart = new Vector2();

  panEnd = new Vector2();

  panDelta = new Vector2();

  pinchStart = new Vector2();

  pinchEnd = new Vector2();

  pinchDelta = new Vector2();

  pointerPositions: Map<number, Vector2> = new Map<number, Vector2>();

  state: State = 'none';

  rotateSpeed = 2.0;

  pinchSpeed = 1.0;

  panSpeed = 1.0;

  selectedObject: THREE.Intersection | null = null;

  // from orbit controls
  @action
  onPointerDown(event: PointerEvent) {
    clearTimeout(this.longPressTimer);
    this.longPressTriggered = false;
    if (this.pointers.length === 0) {
      // save touched object for pinch, rotate and pan callbacks
      this.selectedObject = this.raycast(event);
      this.canvas.setPointerCapture(event.pointerId);
    }
    this.pointers.push(event);
    if (event.pointerType === 'touch' && this.pointers.length === 2) {
      this.handlePinchStart();
      this.handleRotateStart();
    } else if (event.button === 0 && this.pointers.length === 1) {
      this.dispatchCloseMenuEvent(event);
      this.handlePanStart(event);
      if (event.pointerType === 'touch') {
        this.longPressStart.set(event.clientX, event.clientY);
        this.longPressTimer = setTimeout(
          () => this.handleLongPress(event),
          500
        );
      }
    }
  }

  handleLongPress(event: PointerEvent) {
    this.longPressTriggered = true;
    this.longPressDelta.subVectors(this.longPressEnd, this.longPressStart);
    if (this.selectedObject) {
      const mousePosition = new Vector2(event.clientX, event.clientY);
      this.namedArgs.mouseStop?.(this.selectedObject, mousePosition);
    } else if (this.longPressDelta.x < 35 && this.longPressDelta.y < 35) {
      this.dispatchOpenMenuEvent(event);
    }
  }

  handlePinchStart() {
    const dx = this.pointers[0].pageX - this.pointers[1].pageX;
    const dy = this.pointers[0].pageY - this.pointers[1].pageY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    this.pinchStart.set(0, distance);
  }

  handleRotateStart() {
    const dx = this.pointers[0].pageX - this.pointers[1].pageX;
    const dy = this.pointers[0].pageY - this.pointers[1].pageY;

    this.rotateStart = Math.atan2(dy, dx);
  }

  handlePanStart(event: PointerEvent) {
    this.panStart.set(event.clientX, event.clientY);
  }

  handleMouseMovePan(event: PointerEvent) {
    this.longPressEnd.set(event.clientX, event.clientY);
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.namedArgs.pan?.(this.selectedObject, this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);

    // Register pan action to avoid unwanted triggering of click events
    if (this.panDelta.length() > this.PAN_THRESHOLD) {
      this.latestPanTimestamp = event.timeStamp;
    }
  }

  trackPointer(event: PointerEvent) {
    let position = this.pointerPositions.get(event.pointerId);

    if (position === undefined) {
      position = new Vector2();
      this.pointerPositions.set(event.pointerId, position);
    }

    position.set(event.pageX, event.pageY);
  }

  onTouchMove(event: PointerEvent) {
    if (this.pointers.length === 2) {
      this.trackPointer(event);
      this.handleTouchMovePinch(event);
      this.handleTouchMoveRotate();
    }
  }

  handleTouchMovePinch(event: PointerEvent) {
    const position = this.getSecondPointerPosition(event);
    if (!position) {
      return;
    }

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    this.pinchEnd.set(0, distance);

    this.pinchDelta.set(
      0,
      (this.pinchEnd.y / this.pinchStart.y) ** this.pinchSpeed
    );

    this.namedArgs.pinch?.(this.selectedObject, this.pinchDelta.y);

    this.pinchStart.copy(this.pinchEnd);
  }

  handleTouchMoveRotate() {
    if (this.pointers.length === 2) {
      // use pointers always in the same order
      const pointer0 = this.pointerPositions.get(this.pointers[0].pointerId);
      const pointer1 = this.pointerPositions.get(this.pointers[1].pointerId);

      if (!pointer0 || !pointer1) {
        return;
      }

      const dx = pointer0.x - pointer1.x;
      const dy = pointer0.y - pointer1.y;

      const rotateEnd = Math.atan2(dy, dx);
      const angleChange = (this.rotateStart - rotateEnd) * this.rotateSpeed;

      this.namedArgs.rotate?.(this.selectedObject, angleChange);

      this.rotateStart = rotateEnd;
    }
  }

  getSecondPointerPosition(event: PointerEvent) {
    const pointer =
      event.pointerId === this.pointers[0].pointerId
        ? this.pointers[1]
        : this.pointers[0];

    return this.pointerPositions.get(pointer.pointerId);
  }

  @action
  onPointerUp(event: PointerEvent) {
    clearTimeout(this.longPressTimer);
    this.onClickEventsingleClickUp(event);
    this.removePointer(event);

    if (this.pointers.length === 0) {
      this.canvas.releasePointerCapture(event.pointerId);
      this.selectedObject = null;
    }
  }

  @action
  removePointer(event: PointerEvent) {
    this.pointerPositions.delete(event.pointerId);

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId === event.pointerId) {
        this.pointers.splice(i, 1);
        return;
      }
    }
  }

  @action
  onPointerCancel(event: PointerEvent) {
    this.removePointer(event);
  }
}
