// @ts-ignore because three mesh ui's typescript support is not fully matured
import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';

export default class ScrollUpButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  text: ThreeMeshUI.Text;
  readonly initialY: number;

  constructor(text: ThreeMeshUI.Text, options: ThreeMeshUI.BlockOptions) {
    super(options);
    this.text = text;
    this.initialY = text.position.y;
    const scrollText = new ThreeMeshUI.Text({ content: 'Scroll Up' });
    this.add(scrollText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerPress() {
    const scrollValue = -0.01;
    if (this.text.position.y + scrollValue > this.initialY) {
      // don't scroll up when we are already at top
      this.text.position.y += scrollValue;
    }
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    this.set({ backgroundOpacity: 0 });
  }
}
