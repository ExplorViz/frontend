// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from '../interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';

export default class ScrollDownButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  text: ThreeMeshUI.Text;

  constructor(text: ThreeMeshUI.Text, options: ThreeMeshUI.BlockOptions) {
    super(options);
    this.text = text;
    const scrollText = new ThreeMeshUI.Text({ content: 'Scroll Down' });
    this.add(scrollText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerPress() {
    this.text.position.y += 0.01;
  }

  // easy implementation of a scroll limit (so that we are not allowed to scroll down infinetly) not possible until the release of three mesh ui version 7.x.x and its height: auto; Box-property.
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
