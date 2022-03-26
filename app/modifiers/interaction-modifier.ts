import Modifier from 'ember-modifier';
import { action } from '@ember/object';
import { assert } from '@ember/debug';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import THREE, { Object3D, Mesh } from 'three';
import { inject as service } from '@ember/service';
import CollaborativeService from 'explorviz-frontend/services/collaborative-service';
import CollaborativeSettingsService from 'explorviz-frontend/services/collaborative-settings-service';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import debugLogger from 'ember-debug-logger';
import { KeyEvent } from '@ember/test-helpers/dom/trigger-key-event';
import LocalUser from 'collaborative-mode/services/local-user';
import { taskFor } from 'ember-concurrency-ts';
import VrSceneService from 'virtual-reality/services/vr-scene';

export type Position2D = {
  x: number,
  y: number
};

type MouseStopEvent = {
  srcEvent: MouseEvent
};

interface InteractionModifierArgs {
  positional: [],
  named: {
    mousePositionX: number,
    camera: THREE.Camera,
    raycastObjects: Object3D | Object3D[],
    raycastFilter?: ((intersection: THREE.Intersection) => boolean) | null,
    mouseEnter?(): void,
    mouseLeave?(): void,
    mouseOut?(): void,
    mouseMove?(intersection: THREE.Intersection | null): void,
    mouseStop?(intersection: THREE.Intersection | null, mousePosition?: Position2D): void,
    singleClick?(intersection: THREE.Object3D): void,
    doubleClick?(intersection: THREE.Object3D): void,
    mousePing?(intersection: THREE.Object3D): void,
  }
}

export default class InteractionModifierModifier extends Modifier<InteractionModifierArgs> {
  // Used to determine if and which object was hit
  raycaster: Raycaster;

  debug = debugLogger('InteractionModifier');

  @service('collaborative-service')
  collaborativeService!: CollaborativeService;

  @service('collaborative-settings-service')
  collaborativeSettings!: CollaborativeSettingsService;

  @service('local-user')
  private localUser!: LocalUser;

  isMouseOnCanvas = false;

  pointer = new THREE.Vector2();

  timer!: NodeJS.Timeout;

  didInstall() {
    this.canvas.addEventListener('click', this.onSingleClick)
    // should work most of the time. Even tried it on Chrome for Android and it worked
    // https://caniuse.com/mdn-api_element_dblclick_event
    this.canvas.addEventListener('dblclick', this.onDoubleClick)
    this.canvas.addEventListener('pointerenter', this.onPointerEnter);
    this.canvas.addEventListener('pointerout', this.onPointerOut);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerstop', this.onPointerStop);
  }

  willDestroy() {
    this.canvas.removeEventListener('click', this.onSingleClick)
    this.canvas.removeEventListener('dblclick', this.onDoubleClick)
    this.canvas.removeEventListener('pointerenter', this.onPointerEnter);
    this.canvas.removeEventListener('pointerout', this.onPointerOut);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerstop', this.onPointerStop);
  }

  get canvas(): HTMLCanvasElement {
    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof this.element}`,
      this.element instanceof HTMLCanvasElement,
    );
    return this.element;
  }

  get raycastObjects(): Object3D | Object3D[] {
    return this.args.named.raycastObjects;
  }

  get raycastFilter(): ((intersection: THREE.Intersection) => boolean) | undefined {
    const filter = this.args.named.raycastFilter;

    // Use default filter if no one is passed
    if (filter === undefined) {
      return (intersection: THREE.Intersection) => !(intersection.object instanceof LabelMesh
        || intersection.object instanceof LogoMesh);
      // Use no filter if null is passed explicitly
    } if (filter === null) {
      return undefined;
    }
    return filter;
  }

  get camera(): THREE.Camera {
    return this.args.named.camera;
  }

  constructor(owner: any, args: InteractionModifierArgs) {
    super(owner, args);
    this.raycaster = new Raycaster();
  }

  @action
  onPointerEnter() {
    this.isMouseOnCanvas = true;

    if (!this.args.named.mouseEnter) { return; }

    this.args.named.mouseEnter();
  }

  @action
  onPointerOut() {
    this.isMouseOnCanvas = false;
    if (!this.args.named.mouseOut || !this.collaborativeSettings.isInteractionAllowed) { return; }

    this.args.named.mouseOut();

    if (this.collaborativeSettings.meeting) {
      this.collaborativeService.sendMouseOut();
    }
  }

  @action
  onPointerMove(evt: PointerEvent) {
    this.isMouseOnCanvas = true;

    if (!this.args.named.mouseMove || !this.collaborativeSettings.isInteractionAllowed) { return; }

    // Extract mouse position
    const mouse: Position2D = InteractionModifierModifier.getMousePos(this.canvas, evt);

    const intersectedViewObj = this.raycast(mouse);

    this.args.named.mouseMove(intersectedViewObj);

    if (this.raycastObjects instanceof Object3D && intersectedViewObj
      && intersectedViewObj.object instanceof Mesh && this.collaborativeSettings.meeting) {
      this.collaborativeService.sendMouseMove(intersectedViewObj.point,
        this.raycastObjects.quaternion, intersectedViewObj.object);
    }
  }

  @action
  onPointerStop(evt: CustomEvent<MouseStopEvent>) {
    if (!this.args.named.mouseStop || !this.collaborativeSettings.isInteractionAllowed) { return; }

    // Extract mouse position
    const mouse: Position2D = InteractionModifierModifier
      .getMousePos(this.canvas, evt.detail.srcEvent);

    const intersectedViewObj = this.raycast(mouse);
    this.args.named.mouseStop(intersectedViewObj, mouse);

    if (this.raycastObjects instanceof Object3D && intersectedViewObj
      && intersectedViewObj.object instanceof Mesh && this.collaborativeSettings.meeting) {
      this.collaborativeService.sendMouseStop(intersectedViewObj.point,
        this.raycastObjects.quaternion, intersectedViewObj.object);
    }
  }

  @action
  onSingleClick(event: MouseEvent) {

    if (event.detail === 1) {
      this.timer = setTimeout(() => {
        this.debug('On single click');
        const intersectedViewObj = this.raycastEvent(event);
        this.debug('On single click' + intersectedViewObj);
        if (intersectedViewObj) {
          if (event.altKey) {
            if (this.localUser.mousePing) {
              this.debug('Pinging');
              taskFor(this.localUser.mousePing.ping).perform({ parentObj: intersectedViewObj.object, position: intersectedViewObj.point })
            }
          } else {
            this.args.named.singleClick?.(intersectedViewObj.object);
          }
        }

      }, 200)
    }

    // const intersectedViewObj = this.raycast(mouse);
    // this.args.named.singleClick(intersectedViewObj);

    // if (intersectedViewObj && intersectedViewObj.object instanceof Mesh
    //   && this.collaborativeSettings.meeting) {
    //   this.collaborativeService.sendSingleClick(intersectedViewObj.object);
    // }
  }

  @action
  onDoubleClick(event: MouseEvent) {
    clearTimeout(this.timer);
    this.debug('On double click');
    const intersectedViewObj = this.raycastEvent(event);
    this.debug('On double click' + intersectedViewObj);
    if (intersectedViewObj) {
      this.args.named.doubleClick?.(intersectedViewObj.object);
    }
    // if (intersectedViewObj && intersectedViewObj.object instanceof Mesh
    //   && this.collaborativeSettings.meeting) {
    //   this.collaborativeService.sendDoubleClick(intersectedViewObj.object);
    // }
  }

  sendPerspective() {
    if (this.collaborativeSettings.meeting && this.raycastObjects instanceof Object3D) {
      this.collaborativeService.sendPerspective({
        position: this.camera.position.toArray(),
        rotation: this.raycastObjects.rotation?.toArray().slice(0, 3),
        requested: false,
      });
    }
  }

  raycastEvent(event: MouseEvent) {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = - (event.clientY / window.innerHeight) * 2 + 1;
    return this.raycast(new THREE.Vector2(x, y));
  }

  raycast(origin: THREE.Vector2) {

    // this.debug('Mouse' + origin.x + '-' + origin.y)
    const possibleObjects = this.raycastObjects instanceof Object3D
      ? [this.raycastObjects] : this.raycastObjects;

    // this.debug('raycasting');
    const intersectedViewObj = this.raycaster.raycasting(origin, this.args.named.camera,
      possibleObjects, this.raycastFilter);

    return intersectedViewObj;
  }

  calculatePositionInScene(mouseOnCanvas: Position2D) {
    const x = (mouseOnCanvas.x / this.canvas.clientWidth) * 2 - 1;

    const y = -(mouseOnCanvas.y / this.canvas.clientHeight) * 2 + 1;

    return { x, y };
  }

  createMouseStopEvent() {
    const self = this;

    // Custom event for mousemovement end
    (function computeMouseMoveEvent(delay) {
      let timeout: NodeJS.Timeout;
      self.canvas.addEventListener('mousemove', (evt: MouseEvent) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const event = new CustomEvent<MouseStopEvent>('mousestop', {
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

  static getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Position2D {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  static getTouchPos(canvas: HTMLCanvasElement, evt: TouchEvent): Position2D {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.targetTouches[0].clientX - rect.left,
      y: evt.targetTouches[0].clientY - rect.top,
    };
  }
}
