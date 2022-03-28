import Modifier from 'ember-modifier';
import { action } from '@ember/object';
import { assert } from '@ember/debug';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import THREE, { Object3D, Vector2 } from 'three';
import { inject as service } from '@ember/service';
import CollaborativeService from 'explorviz-frontend/services/collaborative-service';
import CollaborativeSettingsService from 'explorviz-frontend/services/collaborative-settings-service';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import debugLogger from 'ember-debug-logger';
import LocalUser from 'collaborative-mode/services/local-user';
import { taskFor } from 'ember-concurrency-ts';

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
    mouseMove?(intersection: THREE.Object3D | undefined): void,
    mouseStop?(intersection: THREE.Object3D, mousePosition?: Vector2): void,
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

    this.createPointerStopEvent();
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
    const raycastObjects = this.args.named.raycastObjects;
    return raycastObjects instanceof Object3D
      ? [raycastObjects] : raycastObjects;
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

    this.args.named.mouseEnter?.();
  }

  @action
  onPointerOut() {
    this.isMouseOnCanvas = false;

    this.args.named.mouseOut?.();
  }

  @action
  onPointerMove(event: PointerEvent) {
    this.isMouseOnCanvas = true;

    // TODO this could be moved into the rendering loop to reduce the frequency
    const intersectedViewObj = this.raycast(event);

    this.args.named.mouseMove?.(intersectedViewObj?.object);
  }

  @action
  onPointerStop(customEvent: CustomEvent<MouseStopEvent>) {
    const event = customEvent.detail.srcEvent;

    const intersectedViewObj = this.raycast(event);
    if (intersectedViewObj) {
      const mousePosition = new Vector2(event.clientX, event.clientY);
      this.args.named.mouseStop?.(intersectedViewObj.object, mousePosition);
    }
  }

  @action
  onSingleClick(event: MouseEvent) {

    if (event.detail === 1) {
      this.timer = setTimeout(() => {
        const intersectedViewObj = this.raycast(event);
        if (intersectedViewObj) {
          if (event.altKey) {
            if (this.localUser.mousePing) {
              taskFor(this.localUser.mousePing.ping).perform({ parentObj: intersectedViewObj.object, position: intersectedViewObj.point })
            }
          } else {
            this.args.named.singleClick?.(intersectedViewObj.object);
          }
        }

      }, 200)
    }
  }

  @action
  onDoubleClick(event: MouseEvent) {
    clearTimeout(this.timer);
    const intersectedViewObj = this.raycast(event);
    if (intersectedViewObj) {
      this.args.named.doubleClick?.(intersectedViewObj.object);
    }
  }

  raycast(event: MouseEvent) {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = - (event.clientY / window.innerHeight) * 2 + 1;
    const origin = new Vector2(x, y)
    const possibleObjects = this.raycastObjects instanceof Object3D
      ? [this.raycastObjects] : this.raycastObjects;

    const intersectedViewObj = this.raycaster.raycasting(origin, this.args.named.camera,
      possibleObjects, this.raycastFilter);

    return intersectedViewObj;
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
}
