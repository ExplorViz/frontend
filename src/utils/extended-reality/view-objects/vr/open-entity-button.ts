// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';

export type OpenEntityButtonArgs = ThreeMeshUI.BlockOptions & {
  label: string;
  classId: string;
  applicationId: string;
};

export default class OpenEntityButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  label: string;
  classId: string;
  applicationId: string;

  constructor({
    label,
    classId,
    applicationId,
    ...options
  }: OpenEntityButtonArgs) {
    super(options);
    this.label = label;
    this.applicationId = applicationId;
    this.classId = classId;
    const labelBox = new ThreeMeshUI.Text({ content: label });
    this.add(labelBox);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    // ToDo
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.2 });
  }
}
