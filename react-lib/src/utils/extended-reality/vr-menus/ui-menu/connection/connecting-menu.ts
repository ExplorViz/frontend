import TextbuttonItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/textbutton-item';
import ConnectionBaseMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/base';
import { UiMenuArgs } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import TitleItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/title-item';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';

export default class ConnectingMenu extends ConnectionBaseMenu {
  constructor(args: UiMenuArgs) {
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
      onTriggerDown: () => useCollaborationSessionStore.getState().disconnect(),
    });
    this.items.push(cancelButton);
    this.thumbpadTargets.push(cancelButton);

    this.redrawMenu();
  }
}
