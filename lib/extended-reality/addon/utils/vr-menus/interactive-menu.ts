/* eslint-disable @typescript-eslint/no-unused-vars */
import { IntersectableObject } from 'extended-reality/utils/view-objects/interfaces/intersectable-object';
import AnimatedMenu from './animated-menu';

export default abstract class InteractiveMenu
  extends AnimatedMenu
  implements IntersectableObject
{
  /**
   * Interactive menus can be intersected by a controller's ray by default.
   */
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  /**
   * Called when the other controller's ray intersects this menu.
   */
  hover(_intersection: THREE.Intersection) {
    // will be overriden
  }

  /**
   * Called once when the other controller's trigger is pressed down while
   * hovering this menu. This method is not called again before the trigger
   * is released.
   *
   * @param _intersection The intersected point of the menu that is hovered.
   */
  triggerDown(_intersection: THREE.Intersection) {
    // will be overriden
  }

  /**
   * Called when the other controller's trigger is pressed while hovering this
   * menu.
   *
   * @param _intersection The intersected point of the menu that is hovered.
   * @param _value The intensity of the trigger press.
   */
  triggerPress(_intersection: THREE.Intersection, _value: number) {
    // will be overriden
  }

  /**
   * Called once when the other controller's trigger is released while
   * hovering this menu.
   *
   * @param _intersection The intersected point of the menu that is hovered.
   */
  triggerUp(_intersection: THREE.Intersection) {
    // will be overriden
  }

  /**
   * Called when this menu is hovered to apply visual feedback for the hover
   * effect.
   */
  applyHoverEffect() {
    // will be overriden
  }

  /**
   * Called when this menu is not hovered anymore to reset the visual feedback
   * for the hover effect.
   */
  resetHoverEffect() {
    // will be overriden
  }
}
