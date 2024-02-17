import { GrabbableObject } from 'extended-reality/utils/view-objects/interfaces/grabbable-object';
import { DetachableMenu } from './detachable-menu';
import MenuGroup, { MenuGroupArgs } from './menu-group';

export type DetachedMenuGroupArgs = MenuGroupArgs & {
  menu: DetachableMenu;
  menuId: string | null;
};

/**
 * A menu group that contains a single detched menu and makes it grabbable.
 *
 * Since this is a menu group, the detached menu can still open sub menus.
 */
export default class DetachedMenuGroup
  extends MenuGroup
  implements GrabbableObject
{
  menuId: string | null;

  constructor({ menu, menuId, ...args }: DetachedMenuGroupArgs) {
    super(args);
    this.menuId = menuId;

    // Add menu to menu group and notify it that it has been opened when it was
    // not open previously.
    this.addMenu(menu);
    if (!menu.isMenuOpen) menu.onOpenMenu();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  getGrabId(): string | null {
    return this.menuId;
  }
}
