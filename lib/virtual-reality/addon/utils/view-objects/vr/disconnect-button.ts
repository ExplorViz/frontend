// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from '../interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';
import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';

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

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  constructor({ owner, ...options }: DisconnectButtonArgs) {
    super(options);
    this.owner = owner;
    setOwner(this, this.owner);
    this.text = new ThreeMeshUI.Text({ content: 'Disconnect' });
    this.add(this.text);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerPress() {
    this.collaborationSession.disconnect();
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
