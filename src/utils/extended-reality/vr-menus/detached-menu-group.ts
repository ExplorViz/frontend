import { GrabbableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import { DetachableMenu } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/detachable-menu';
import MenuGroup from 'explorviz-frontend/src/utils/extended-reality/vr-menus/menu-group';

export type DetachedMenuGroupArgs = {
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

  constructor({ menu, menuId }: DetachedMenuGroupArgs) {
    super();
    this.menuId = menuId;

    // Add menu to menu group and notify it that it has been opened when it was
    // not open previously.
    this.addMenu(menu);
    if (!menu.isMenuOpen) menu.onOpenMenu();
  }

  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  getGrabId(): string | null {
    return this.menuId;
  }
}
