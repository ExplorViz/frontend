import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import { taskFor } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import CollaborativeService from 'explorviz-frontend/services/collaborative-service';
import CollaborativeSettingsService from 'explorviz-frontend/services/collaborative-settings-service';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import THREE, { Object3D, Vector2 } from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';


export type Position2D = {
  x: number,
  y: number
};

type MouseStopEvent = {
  srcEvent: MouseEvent
};
type State = 'pinch' | 'none';

interface NamedArgs {
  mousePositionX: number,
  camera: THREE.Camera,
  raycastObjects: Object3D | Object3D[],
  raycastFilter?: ((intersection: THREE.Intersection) => boolean) | null,
  mouseEnter?(): void,
  mouseLeave?(): void,
  mouseOut?(): void,
  mouseMove?(intersection: THREE.Intersection | null): void,
  mouseStop?(intersection: THREE.Intersection, mousePosition?: Vector2): void,
  singleClick?(intersection: THREE.Intersection): void,
  doubleClick?(intersection: THREE.Intersection): void,
  mousePing?(intersection: THREE.Intersection): void,
  pinch?(intersection: THREE.Intersection, delta: number): void,
  rotate?(intersection: THREE.Intersection, delta: number): void,
  pan?(intersection: THREE.Intersection, x: number, y: number): void,
}

interface InteractionModifierArgs {
  positional: [],
  named: NamedArgs,
}

function cleanup(instance: InteractionModifierModifier) {
  let { canvas } = instance;

  canvas.removeEventListener('pointerdown', instance.onPointerDown)
  canvas.removeEventListener('pointerup', instance.onPointerUp)
  // canvas.removeEventListener('dblclick', instance.onDoubleClick)
  canvas.removeEventListener('pointerenter', instance.onPointerEnter);
  canvas.removeEventListener('pointerout', instance.onPointerOut);
  canvas.removeEventListener('pointercancel', instance.onPointerCancel);
  canvas.removeEventListener('pointermove', instance.onPointerMove);
  canvas.removeEventListener('pointerstop', instance.onPointerStop);
}

export default class InteractionModifierModifier extends Modifier<InteractionModifierArgs> {
  // Used to determine if and which object was hit
  raycaster: Raycaster;

  debug = debugLogger('InteractionModifier');

  @service('collaborative-service')
  collaborativeService!: CollaborativeService;

  @service('collaboration-session')
  collaborativeSession!: CollaborationSession;

  @service('collaborative-settings-service')
  collaborativeSettings!: CollaborativeSettingsService;

  @service('local-user')
  private localUser!: LocalUser;

  isMouseOnCanvas = false;

  pointer = new THREE.Vector2();

  timer!: NodeJS.Timeout;

  pointerDownCounter: number = 0;

  didSetup = false;
  namedArgs!: NamedArgs;

  canvas!: HTMLCanvasElement;

  modify(element: any, [], args: NamedArgs) {
    this.namedArgs = args;

    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof element}`,
      element instanceof HTMLCanvasElement,
    );
    this.canvas = element;

    if (!this.didSetup) {
      this.canvas.addEventListener('pointerdown', this.onPointerDown)
      this.canvas.addEventListener('pointerup', this.onPointerUp)
      this.canvas.addEventListener('pointerenter', this.onPointerEnter);
      this.canvas.addEventListener('pointerout', this.onPointerOut);
      this.canvas.addEventListener('pointermove', this.onPointerMove);

      this.createPointerStopEvent();
      this.canvas.addEventListener('pointerstop', this.onPointerStop);

      registerDestructor(this, cleanup)
      this.didSetup = true;
    }
  }

  get raycastObjects(): Object3D | Object3D[] {
    const raycastObjects = this.namedArgs.raycastObjects;
    return raycastObjects instanceof Object3D
      ? [raycastObjects] : raycastObjects;
  }

  get raycastFilter(): ((intersection: THREE.Intersection) => boolean) | undefined {
    const filter = this.namedArgs.raycastFilter;
    if (filter === null) {
      return undefined;
    }
    return filter;
  }

  get camera(): THREE.Camera {
    return this.namedArgs.camera;
  }

  constructor(owner: any, args: InteractionModifierArgs) {
    super(owner, args);
    this.raycaster = new Raycaster();
  }

  @action
  onPointerEnter() {
    this.isMouseOnCanvas = true;

    this.namedArgs.mouseEnter?.();
  }

  @action onPointerOut() {
    this.isMouseOnCanvas = false;

    this.namedArgs.mouseOut?.();
  }

  @action
  onPointerMove(event: PointerEvent) {
    this.isMouseOnCanvas = true;
    this.pointerDownCounter = 0;

    if (event.pointerType === 'touch' && this.pointers.length == 2) {
      this.onTouchMove(event);
    } else if (this.pointers.length == 1) {
      this.handleMouseMovePan(event);
    } else {
      const intersectedViewObj = this.raycast(event);

      this.namedArgs.mouseMove?.(intersectedViewObj);
    }
  }

  @action
  onPointerStop(customEvent: CustomEvent<MouseStopEvent>) {
    const event = customEvent.detail.srcEvent;

    const intersectedViewObj = this.raycast(event);
    if (intersectedViewObj) {
      const mousePosition = new Vector2(event.clientX, event.clientY);
      this.namedArgs.mouseStop?.(intersectedViewObj, mousePosition);
    }
  }


  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @action
  onClickEventsingleClickUp(event: MouseEvent) {
    if (event.button == 0 && this.pointers.length == 1) {
      if (this.pointerDownCounter == 1) {
        this.timer = setTimeout(() => {
          this.pointerDownCounter = 0;
          const intersectedViewObj = this.raycast(event);
          if (intersectedViewObj) {
            if (event.altKey) {
              if (this.localUser.mousePing) {

                const parentObj = intersectedViewObj.object.parent;
                const pingPosition = intersectedViewObj.point;
                if (parentObj) {

                  parentObj.worldToLocal(pingPosition);
                  taskFor(this.localUser.mousePing.ping).perform({ parentObj: parentObj, position: pingPosition })

                  if (this.collaborativeSession.isOnline) {
                    if (parentObj instanceof ApplicationObject3D) {
                      // AlertifyHandler.showAlertifyMessage('OBJ:' + pingPosition.toArray())
                      this.sender.sendMousePingUpdate(parentObj.dataModel.id, true, pingPosition);
                    } else {
                      this.sender.sendMousePingUpdate('landscape', false, pingPosition);
                    }
                  }
                }
              }
            } else {
              this.namedArgs.singleClick?.(intersectedViewObj);
            }
          }
        }, 300)
      }

      if (this.pointerDownCounter > 1) {
        this.pointerDownCounter = 0;
        this.onDoubleClick(event);
      }
    }
  }

  @action
  onDoubleClick(event: MouseEvent) {
    clearTimeout(this.timer);

    const intersectedViewObj = this.raycast(event);
    if (intersectedViewObj) {
      this.namedArgs.doubleClick?.(intersectedViewObj);
    }
  }

  raycast(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const x = ((event.x - rect.left) / width) * 2 - 1;
    const y = - ((event.y - rect.top) / height) * 2 + 1;

    const origin = new Vector2(x, y)
    const possibleObjects = this.raycastObjects instanceof Object3D
      ? [this.raycastObjects] : this.raycastObjects;


    return this.raycaster.raycasting(origin, this.namedArgs.camera,
      possibleObjects, this.raycastFilter);
  }

  createPointerStopEvent() {
    const self = this;

    // Custom event for mousemovement end
    (function computeMouseMoveEvent(delay) {
      let timeout: NodeJS.Timeout;
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
          if (evt.target && self.isMouseOnCanvas) evt.target.dispatchEvent(event);
        }, delay);
      });
    }(300));
  }

  pointers: PointerEvent[] = [];

  rotateStart = 0;

  panStart = new Vector2();
  panEnd = new Vector2();
  panDelta = new Vector2();

  pinchStart = new Vector2();
  pinchEnd = new Vector2();
  pinchDelta = new Vector2();

  pointerPositions: Map<number, Vector2> = new Map<number, Vector2>();

  state: State = 'none'

  rotateSpeed = 2.0;
  pinchSpeed = 1.0;
  panSpeed = 1.0;

  selectedObject: THREE.Intersection | null = null;

  // from orbit controls
  @action
  onPointerDown(event: PointerEvent) {
    if (this.pointers.length === 0) {
      this.selectedObject = this.raycast(event);
      this.canvas.setPointerCapture(event.pointerId);
    }
    this.pointers.push(event);
    if (event.pointerType === 'touch' && this.selectedObject && this.pointers.length == 2) {
      this.handlePinchStart()
      this.handleRotateStart()
    } else if (event.button == 0 && this.pointers.length == 1) {
      this.pointerDownCounter += 1;
      this.handlePanStart(event);
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
    if (!this.selectedObject) { return; }
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
    this.namedArgs.pan?.(this.selectedObject, this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
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
    if (this.selectedObject && this.pointers.length == 2) {
      this.trackPointer(event);
      this.handleTouchMovePinch(event);
      this.handleTouchMoveRotate();
    }
  }

  handleTouchMovePinch(event: PointerEvent) {
    const position = this.getSecondPointerPosition(event);
    if (!position || !this.selectedObject) { return; }

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    this.pinchEnd.set(0, distance);

    this.pinchDelta.set(0, Math.pow(this.pinchEnd.y / this.pinchStart.y, this.pinchSpeed));

    this.namedArgs.pinch?.(this.selectedObject, this.pinchDelta.y);

    this.pinchStart.copy(this.pinchEnd);
  }

  handleTouchMoveRotate() {
    if (this.pointers.length == 2) {
      // use pointers always in the same order
      const pointer0 = this.pointerPositions.get(this.pointers[0].pointerId);
      const pointer1 = this.pointerPositions.get(this.pointers[1].pointerId);

      if (!pointer0 || !pointer1 || !this.selectedObject) { return; }

      const dx = pointer0.x - pointer1.x;
      const dy = pointer0.y - pointer1.y;

      const rotateEnd = Math.atan2(dy, dx);
      var angleChange = (this.rotateStart - rotateEnd) * this.rotateSpeed;

      this.namedArgs.rotate?.(this.selectedObject, angleChange);

      this.rotateStart = rotateEnd;
    }
  }

  getSecondPointerPosition(event: PointerEvent) {
    const pointer = (event.pointerId === this.pointers[0].pointerId) ? this.pointers[1] : this.pointers[0];

    return this.pointerPositions.get(pointer.pointerId);
  }

  @action
  onPointerUp(event: PointerEvent) {
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
      if (this.pointers[i].pointerId == event.pointerId) {
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
