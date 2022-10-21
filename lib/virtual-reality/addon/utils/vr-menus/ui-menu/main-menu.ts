import TextbuttonItem from '../items/textbutton-item';
import TitleItem from '../items/title-item';
import UiMenu, { UiMenuArgs } from '../ui-menu';

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
        this.menuGroup?.openMenu(this.menuFactory.buildConnectionMenu()),
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
        this.menuGroup?.openMenu(this.menuFactory.buildTimeMenu()),
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
        this.menuGroup?.openMenu(this.menuFactory.buildSettingsMenu()),
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
        this.menuGroup?.openMenu(this.menuFactory.buildResetMenu()),
    });
    this.items.push(resetButton);
    this.thumbpadTargets.push(resetButton);

    this.redrawMenu();
  }
}
