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
  isAuxiliaryCreated: boolean = false;
  text: ThreeMeshUI.Text;
  menuFactory: VrMenuFactoryService;

  readonly initialY: number;
  cx!: number;
  cy!: number;

  constructor(text: ThreeMeshUI.Text, menuFactory: VrMenuFactoryService, options: ThreeMeshUI.BlockOptions) {
    super(options);
    this.text = text;
    this.menuFactory = menuFactory;
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

  applyHover(controller: VRController | null, renderer: VrRendering) {
    this.set({ backgroundOpacity: 0.4 });

    if(!controller?.gripIsPressed) {
    const auxiliaryMenu = this.menuFactory.buildAuxiliaryMenu(this.text, controller, renderer, this);
    if(!this.isAuxiliaryCreated){
      controller?.menuGroup.openMenu(auxiliaryMenu);
      this.isAuxiliaryCreated = true;
    }
  }

  }

  resetHover(controller: VRController | null) {
    this.isTriggered = false;
    this.set({ backgroundOpacity: 0 });

    if(this.isAuxiliaryCreated){
      controller?.menuGroup.closeMenu();
      this.isAuxiliaryCreated = false;
    }


  }
}
