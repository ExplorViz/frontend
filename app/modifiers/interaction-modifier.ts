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
import { registerDestructor } from '@ember/destroyable';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';


export type Position2D = {
  x: number,
  y: number
};

type MouseStopEvent = {
  srcEvent: MouseEvent
};

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
  canvas.removeEventListener('pointermove', instance.onPointerMove);
  canvas.removeEventListener('pointerstop', instance.onPointerStop);
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
    // clearTimeout(this.timer);

    // TODO this could be moved into the rendering loop to reduce the frequency
    const intersectedViewObj = this.raycast(event);

    this.namedArgs.mouseMove?.(intersectedViewObj);
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

  @action
  onPointerDown(event: MouseEvent) {
    if (event.button == 0) {
      this.pointerDownCounter += 1;
    }
  }

  @action
  onPointerUp(event: MouseEvent) {
    AlertifyHandler.showAlertifyMessage('onPointerUp' + event.x);
    if (event.button == 0) {
      if (this.pointerDownCounter == 1) {
        this.timer = setTimeout(() => {
          this.pointerDownCounter = 0;
          const intersectedViewObj = this.raycast(event);
          if (intersectedViewObj) {
            if (event.altKey) {
              if (this.localUser.mousePing) {
                taskFor(this.localUser.mousePing.ping).perform({ parentObj: intersectedViewObj.object, position: intersectedViewObj.point })
              }
            } else {
              this.namedArgs.singleClick?.(intersectedViewObj);
            }
          }
        }, 200)
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
    const width = this.canvas.clientWidth > window.innerWidth ? window.innerWidth : this.canvas.clientWidth;
    const height = this.canvas.clientHeight > window.innerHeight ? window.innerHeight : this.canvas.clientHeight;
    const x = (event.x / width) * 2 - 1;
    const y = - (event.y / height) * 2 + 1;

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
}
