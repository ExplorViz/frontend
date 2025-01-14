import VRControllerButtonBinding from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-button-binding';
import BaseMenu from 'explorviz-frontend/utils/extended-reality/vr-menus/base-menu';

/**
 * A menu that has no controller bindings.
 *
 * This is used by the spectating menu to disable the other controller's menu while the user is
 * spectating.
 */
export default class DisableInputMenu extends BaseMenu {
  makeMenuButtonBinding(): VRControllerButtonBinding<undefined> | undefined {
    // This menu cannot be closed with the menu button.
    return undefined;
  }
}
