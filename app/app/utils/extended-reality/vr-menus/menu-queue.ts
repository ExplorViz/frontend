import BaseMenu from './base-menu';
import MenuGroup, { MenuGroupArgs } from './menu-group';

export type MenuQueueArgs = MenuGroupArgs & {
  nextMenuDelay?: number;
};

/**
 * A menu group that maintains a queue of menus and displays the next menu
 * in the queue automatically once the previous menu is closed.
 */
export default class MenuQueue extends MenuGroup {
  private menuQueue: BaseMenu[];

  private nextMenuDelay: number;

  private nextMenuTime: number;

  constructor({ nextMenuDelay = 0.75, ...args }: MenuQueueArgs) {
    super(args);
    this.menuQueue = [];
    this.nextMenuDelay = nextMenuDelay;
    this.nextMenuTime = 0.0;
  }

  /**
   * Tests whether a menu has been enqueued that matches the given predicate.
   */
  hasEnquedOrCurrentMenu(predicate: (menu: BaseMenu) => boolean) {
    if (this.currentMenu && predicate(this.currentMenu)) return true;
    return this.hasEnquedMenu(predicate);
  }

  /**
   * Tests whether a menu has been enqueued that matches the given predicate.
   */
  hasEnquedMenu(predicate: (menu: BaseMenu) => boolean) {
    return this.menuQueue.any(predicate);
  }

  /**
   * Adds a menu to the queue.
   */
  enqueueMenu(menu: BaseMenu) {
    this.menuQueue.push(menu);
  }

  updateMenu(delta: number) {
    // If there is no current menu count down until `nextMenuTime` reaches zero.
    if (!this.currentMenu) {
      if (this.nextMenuTime > 0.0) {
        this.nextMenuTime -= delta;
      } else {
        // Open the menu after the count down if there is a next menu.
        const nextMenu = this.menuQueue.shift();
        if (nextMenu) {
          this.openMenu(nextMenu);

          // Reset countdown such that there is a delay from when the
          // opened menu closes and the next menu opens.
          this.nextMenuTime = this.nextMenuDelay;
        }
      }
    }
    super.updateMenu(delta);
  }
}
