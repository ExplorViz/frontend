import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import * as THREE from 'three';
import OnlineMenu2 from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';

export const BLOCK_OPTIONS_LIST_ITEM = {
  height: 0.08,
};

export type UserListItemArgs = ThreeMeshUI.BlockOptions & {
  menu: OnlineMenu2;
  userName: string;
  userId: string;
};

export default class UserListItem
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;

  menu: OnlineMenu2;
  userName: string;
  userId: string;

  constructor({ menu, userName, userId, ...options }: UserListItemArgs) {
    super({ ...options, hiddenOverflow: true, contentDirection: 'row' });
    this.menu = menu;
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
