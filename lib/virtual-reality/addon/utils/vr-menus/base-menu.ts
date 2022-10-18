import * as THREE from 'three';
import VrMenuFactoryService from '../../services/vr-menu-factory';
import VRControllerBindings from '../vr-controller/vr-controller-bindings';
import VRControllerButtonBinding from '../vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from '../vr-controller/vr-controller-thumbpad-binding';
import MenuGroup from './menu-group';

export enum MenuState {
  /**
   * The initial state of the menu before it has been opened y a menu group.
   */
  INIT,

  /**
   * The state of the menu when it is the currently open menu of a menu group.
   */
  OPEN,

  /**
   * The state of the menu when it has been closed.
   */
  CLOSED,

  /**
   * The state of the menu when it is still opened by a menu group but another
   * menu is currently active.
   */
  PAUSED,

  /**
   * The state of the menu when it has been detached from the menu group and
   * is placed in the world.
   */
  DETACHED,
}

export type BaseMenuArgs = {
  menuFactory: VrMenuFactoryService;
};

/**
 * Base class for all menus that defines life cycle methods and callbacks for
 * the menu.
 *
 * There are menus with a user interface and menus without a user interface.
 * For example when an object is grabbed an invisible menu is opened that
 * takes control over the button bindings of the controller that grabbed the
 * object.
 */
export default abstract class BaseMenu extends THREE.Group {
  private menuState: MenuState;

  readonly menuFactory: VrMenuFactoryService;

  constructor({ menuFactory }: BaseMenuArgs) {
    super();
    this.menuFactory = menuFactory;
    this.menuState = MenuState.INIT;
  }

  /**
   * Whether this menu is the currently open menu of a menu group.
   */
  get isMenuOpen(): boolean {
    return this.menuState === MenuState.OPEN;
  }

  /**
   * Whether this menu has been closed.
   *
   * Note that this is not the inverse of `isMenuOpen`.
   */
  get isMenuClosed(): boolean {
    return this.menuState === MenuState.CLOSED;
  }

  /**
   * Whether this menu has been paused.
   *
   * A paused menu still belongs to a menu group but there is another menu
   * that is currently active. A paused menu will not receive regular updates.
   */
  get isMenuPaused(): boolean {
    return this.menuState === MenuState.PAUSED;
  }

  /**
   * Whether this menu has been detached from its menu group and has been
   * placed in the world.
   */
  get isMenuDetached(): boolean {
    return this.menuState === MenuState.DETACHED;
  }

  /**
   * Creates the bindings for the thumbpad of the controller that holds this
   * menu.
   */
  makeThumbpadBinding(): VRControllerThumbpadBinding | undefined {
    return undefined;
  }

  /**
   * Creates the binding for the trigger button of the controller that holds
   * this menu.
   */
  makeTriggerButtonBinding(): VRControllerButtonBinding<number> | undefined {
    return undefined;
  }

  /**
   * Creates the binding for the controller's grip button to use for the
   * controller that holds this menu.
   */
  makeGripButtonBinding(): VRControllerButtonBinding<undefined> | undefined {
    return undefined;
  }

  /**
   * Creates the binding for the menu button to use for the controller that
   * holds this menu.
   *
   * By default the menu button closes the menu. Overwrite this method to
   * return `undefined` to disable this behavior.
   */
  makeMenuButtonBinding(): VRControllerButtonBinding<undefined> | undefined {
    return undefined;
  }

  makeBButtonBinding() {
    const label = this.menuGroup?.hasPreviousMenu ? 'Back' : 'Close';
    return new VRControllerButtonBinding(label, {
      onButtonDown: () => this.closeMenu(),
    });
  }

  /**
   * Creates the controller bindings to use for the controller that has opened
   * this menu instead of the default bindings whenever this menu is open.
   *
   * The controller bindings are created when the menu is opened. They do not
   * refresh automatically.
   */
  makeControllerBindings(): VRControllerBindings {
    return new VRControllerBindings({
      thumbpad: this.makeThumbpadBinding(),
      triggerButton: this.makeTriggerButtonBinding(),
      gripButton: this.makeGripButtonBinding(),
      menuButton: this.makeMenuButtonBinding(),
      bButton: this.makeBButtonBinding(),
    });
  }

  /**
   * Whether the controller's ray should be shown when this menu is open.
   *
   * By default, the controller's ray is hidden since the controller cannot
   * be used to interact with the environment while a menu is open. If the
   * controller bindings are overridden by a subclass such that the controller
   * can interact with the environment again, this getter should be overridden
   * as well.
   */
  get enableControllerRay(): boolean {
    return false;
  }

  get enableTeleport(): boolean {
    return this.enableControllerRay;
  }

  get menuGroup(): MenuGroup | null {
    if (this.parent instanceof MenuGroup) return this.parent;
    return null;
  }

  /**
   * Closes this menu.
   */
  closeMenu() {
    this.closeMenusWhile((other) => this === other);
  }

  /**
   * Closes menus of this menu's group until the current menu does not match
   * the given predicate.
   */
  closeMenusWhile(predicate: (menu: BaseMenu) => boolean) {
    this.menuGroup?.closeMenusWhile(predicate);
  }

  /**
   * Detaches this menu.
   */
  detachMenu() {
    this.menuGroup?.detachMenu();
  }

  /**
   * Callback that is invoked by the menu group when this menu is opened.
   */
  onOpenMenu() {
    this.menuState = MenuState.OPEN;
  }

  /**
   * Callback that is invoked by the menu group once per frame.
   *
   * @param delta The time in seconds since the last frame.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateMenu(_delta: number) {
    // will be overriden
  }

  /**
   * Callback that is invoked by the menu group when this menu is hidden because
   * another menu is openend instead.
   */
  onPauseMenu() {
    this.menuState = MenuState.PAUSED;
  }

  /**
   * Callback that is invoked by the menu group when this menu is shown again
   * after it was hidden becaus ethe other menu was closed.
   */
  onResumeMenu() {
    this.menuState = MenuState.OPEN;
  }

  /**
   * Callback that is invoked by the menu group when this menu is detached
   * and added to the world instead.
   */
  onDetachMenu() {
    this.menuState = MenuState.DETACHED;
  }

  /**
   * Callback that is invoked by the menu group when this menu is closed.
   */
  onCloseMenu() {
    this.menuState = MenuState.CLOSED;
  }
}
