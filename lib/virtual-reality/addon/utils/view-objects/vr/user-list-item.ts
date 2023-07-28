import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';

export const BLOCK_OPTIONS_LIST_ITEM = {
  height: 0.08,
};

export type UserListItemArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
  userName: string;
  userId: string;
};

export default class UserListItem
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  isHovered = false;
  userName: string;
  userId: string;


  constructor({
    owner,
    userName,
    userId,
    ...options
  }: UserListItemArgs) {
    super({ ...options, hiddenOverflow: true });
    setOwner(this, owner);
    this.userName = userName;
    this.userId = userId;
    const itemText = new ThreeMeshUI.Text({ content: userName });
    this.add(itemText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(this.userId);
    // TODO: Rufe methode in online-menu2 auf

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
