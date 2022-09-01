import UiMenu, { UiMenuArgs } from './ui-menu';

export const HUD_RENDER_ORDER = 1000;

/**
 * Base class for menus that should be rendered on top of the actual scene.
 */
export default class HudMenu extends UiMenu {
  constructor(args: UiMenuArgs) {
    super(args);
    this.renderOrder = HUD_RENDER_ORDER;
  }

  makeBackgroundMaterial(color: THREE.Color) {
    const material = super.makeBackgroundMaterial(color);
    material.depthTest = false;
    return material;
  }
}
