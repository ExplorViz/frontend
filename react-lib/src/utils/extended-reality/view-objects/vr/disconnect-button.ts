// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';

export type DisconnectButtonArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
};

export default class DisconnectButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  text: ThreeMeshUI.Text;
  owner: any;

  constructor({ owner, ...options }: DisconnectButtonArgs) {
    super(options);
    this.owner = owner;
    this.text = new ThreeMeshUI.Text({ content: 'Disconnect' });
    this.add(this.text);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerPress() {
    useCollaborationSessionStore.getState().disconnect();
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.8 });
  }

  resetHover() {
    this.isHovered = false;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.6 });
  }
}
