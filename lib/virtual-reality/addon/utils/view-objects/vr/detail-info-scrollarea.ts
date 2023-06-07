// @ts-ignore because three mesh ui's typescript support is not fully matured
import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';

export default class DetailInfoScrollarea
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered: boolean = false;
  isTriggered: boolean = false;
  text: ThreeMeshUI.Text;

  readonly initialY: number;
  cx!: number;
  cy!: number;

  constructor(text: ThreeMeshUI.Text, options: ThreeMeshUI.BlockOptions) {
    super(options);
    this.text = text;
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

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    this.isTriggered = false;
    this.set({ backgroundOpacity: 0 });
  }
}
