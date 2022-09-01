import TextbuttonItem from '../../items/textbutton-item';
import ConnectionBaseMenu, { ConnectionBaseMenuArgs } from './base';
import TitleItem from '../../items/title-item';

export default class ConnectingMenu extends ConnectionBaseMenu {
  constructor(args: ConnectionBaseMenuArgs) {
    super(args);

    const title = new TitleItem({
      text: 'Connecting...',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    const cancelButton = new TextbuttonItem({
      text: 'Cancel',
      position: { x: 100, y: 186 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () => this.collaborationSession.disconnect(),
    });
    this.items.push(cancelButton);
    this.thumbpadTargets.push(cancelButton);

    this.redrawMenu();
  }
}
