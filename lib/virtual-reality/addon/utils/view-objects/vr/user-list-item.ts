import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import OnlineMenu2 from 'virtual-reality/utils/vr-menus/ui-menu/connection/online-menu2';

export const BLOCK_OPTIONS_LIST_ITEM = {
  height: 0.08,
};

export type UserListItemArgs = ThreeMeshUI.BlockOptions & {
  menu: OnlineMenu2;
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

  menu: OnlineMenu2;
  userName: string;
  userId: string;

  constructor({ menu, owner, userName, userId, ...options }: UserListItemArgs) {
    super({ ...options, hiddenOverflow: true });
    this.menu = menu;
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
    this.menu.openSpectateViewMenu(this.userId);
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
