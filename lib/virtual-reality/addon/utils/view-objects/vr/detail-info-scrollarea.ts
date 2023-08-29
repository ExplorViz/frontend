// @ts-ignore because three mesh ui's typescript support is not fully matured
import VrMenuFactoryService from 'virtual-reality/services/vr-menu-factory';
import { IntersectableObject } from '../interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';
import VRController from 'virtual-reality/utils/vr-controller';
import VrRendering from 'virtual-reality/components/vr-rendering';

export default class DetailInfoScrollarea
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered: boolean = false;
  isTriggered: boolean = false;
  text: ThreeMeshUI.Text;
  menuFactory: VrMenuFactoryService;
  controllerIdToAuxiliaryMenuOpenFlag: Map<string, boolean>;
  controllerIdToIntersection: Map<string, THREE.Intersection>;
  readonly initialY: number;
  cx!: number;
  cy!: number;

  constructor(
    text: ThreeMeshUI.Text,
    menuFactory: VrMenuFactoryService,
    options: ThreeMeshUI.BlockOptions
  ) {
    super(options);
    this.text = text;
    this.menuFactory = menuFactory;
    this.controllerIdToAuxiliaryMenuOpenFlag = new Map<string, boolean>();
    this.controllerIdToIntersection = new Map<string, THREE.Intersection>();
    this.initialY = this.text.position.y;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown(intersection: THREE.Intersection) {
    if (intersection.uv) {
      if (this.isTriggered) return;

      this.cx = intersection.uv.x;
      this.cy = intersection.uv.y;

      this.isTriggered = true;
    }
  }

  triggerUp() {
    this.isTriggered = false;
  }

  triggerPress(intersection: THREE.Intersection) {
    if (this.isTriggered && intersection.uv) {
      const y = intersection.uv.y;
      const yDiff = y - this.cy;

      if (this.text.position.y + yDiff > this.initialY) {
        // don't scroll up when we are already at top
        this.text.position.y += yDiff;
      }

      this.cy = y;
    }
  }

  applyHover(
    controller: VRController | null,
    intersection: THREE.Intersection,
    renderer: VrRendering
  ) {
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.4 });

    if (controller) {
      const gamepadId = controller.gamepadId;
      const gamepadIndex = controller.gamepadIndex;

      const controllerId: string = gamepadId + gamepadIndex;

      this.controllerIdToIntersection.set(controllerId, intersection);

      if (!controller.gripIsPressed && !controller.triggerIsPressed) {
        if (!this.controllerIdToAuxiliaryMenuOpenFlag.get(controllerId)) {
          const auxiliaryMenu = this.menuFactory.buildAuxiliaryMenu(
            this,
            controller,
            renderer
          );
          controller.menuGroup.openMenu(auxiliaryMenu);
          this.controllerIdToAuxiliaryMenuOpenFlag.set(controllerId, true);
        }
      }
    }
  }

  resetHover(controller: VRController | null) {
    this.isTriggered = false;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0 });

    if (controller) {
      const gamepadId = controller.gamepadId;
      const gamepadIndex = controller.gamepadIndex;

      const controllerId: string = gamepadId + gamepadIndex;

      if (this.controllerIdToAuxiliaryMenuOpenFlag.get(controllerId)) {
        controller.menuGroup.closeMenu();
        this.controllerIdToAuxiliaryMenuOpenFlag.set(controllerId, false);
      }
    }
  }
}
