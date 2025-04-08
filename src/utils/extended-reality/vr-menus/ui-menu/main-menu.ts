import TextbuttonItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/title-item';
import UiMenu, {
  UiMenuArgs,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import { useVrMenuFactoryStore } from 'explorviz-frontend/src/stores/extended-reality/vr-menu-factory';

export default class MainMenu extends UiMenu {
  constructor(args: UiMenuArgs) {
    super(args);

    const title = new TitleItem({
      text: 'Main Menu',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    const connectionButton = new TextbuttonItem({
      text: 'Connection',
      position: { x: 100, y: 80 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.openMenu(
          useVrMenuFactoryStore.getState().buildConnectionMenu()
        ),
    });
    this.items.push(connectionButton);
    this.thumbpadTargets.push(connectionButton);

    const timeButton = new TextbuttonItem({
      text: 'Time',
      position: { x: 100, y: 140 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.openMenu(
          useVrMenuFactoryStore.getState().buildTimeMenu()
        ),
    });
    this.items.push(timeButton);
    this.thumbpadTargets.push(timeButton);

    const settingsButton = new TextbuttonItem({
      text: 'Settings',
      position: { x: 100, y: 200 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.openMenu(
          useVrMenuFactoryStore.getState().buildSettingsMenu()
        ),
    });
    this.items.push(settingsButton);
    this.thumbpadTargets.push(settingsButton);

    const resetButton = new TextbuttonItem({
      text: 'Reset',
      position: { x: 100, y: 260 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.openMenu(
          useVrMenuFactoryStore.getState().buildResetMenu()
        ),
    });
    this.items.push(resetButton);
    this.thumbpadTargets.push(resetButton);

    this.redrawMenu();
  }
}
