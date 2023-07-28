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
  userId: string;
};

export default class UserListItem
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  isHovered = false;
  userId: string;


  constructor({
    owner,
    userId,
    ...options
  }: UserListItemArgs) {
    super({ ...options, hiddenOverflow: true });
    setOwner(this, owner);
    this.userId = userId;
    const userName = this.collaborationSession.lookupRemoteUserById(this.userId)?.userName;
    const itemText = new ThreeMeshUI.Text({ content: userName });
    this.add(itemText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(this.userId);
    // TODO: öffne detachable view
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
