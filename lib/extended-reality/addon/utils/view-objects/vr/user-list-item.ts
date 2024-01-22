import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import CollaborationSession from 'collaboration/services/collaboration-session';
import OnlineMenu2 from 'extended-reality/utils/vr-menus/ui-menu/connection/online-menu2';
import LocalUser from 'collaboration/services/local-user';

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

  @service('local-user')
  localUser!: LocalUser;

  isHovered = false;

  menu: OnlineMenu2;
  userName: string;
  userId: string;

  constructor({ menu, owner, userName, userId, ...options }: UserListItemArgs) {
    super({ ...options, hiddenOverflow: true, contentDirection: 'row' });
    this.menu = menu;
    setOwner(this, owner);
    this.userName = userName;
    this.userId = userId;
    const textBox = new ThreeMeshUI.Block({
      width: options.width - 0.09,
      height: options.height,
      justifyContent: 'center',
      textAlign: 'left',
      padding: 0.03,
      backgroundOpacity: 0,
    });
    const itemText = new ThreeMeshUI.Text({ content: userName });
    textBox.add(itemText);
    this.add(textBox);

    const imageBlock = new ThreeMeshUI.Block({
      height: 0.08,
      width: 0.08,
    });
    const loader = new THREE.TextureLoader();
    loader.load('images/menu-icons/camera-128.png', (texture) => {
      // @ts-ignore no types atm
      imageBlock.set({ backgroundTexture: texture });
    });
    this.add(imageBlock);
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
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0 });
  }
}
