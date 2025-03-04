import TextbuttonItem from 'react-lib/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'react-lib/src/utils/extended-reality/vr-menus/items/title-item';
import ConnectionBaseMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/base';

import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { UiMenuArgs } from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu';
import { useVrMenuFactoryStore } from 'react-lib/src/stores/extended-reality/vr-menu-factory';

export default class OfflineMenu extends ConnectionBaseMenu {
  constructor(args: UiMenuArgs) {
    super(args);

    const title = new TitleItem({
      text: 'You are offline',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    const joinButton = new TextbuttonItem({
      text: 'Join Room',
      position: { x: 100, y: 156 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () =>
        this.menuGroup?.replaceMenu(
          useVrMenuFactoryStore.getState().buildJoinMenu()
        ),
    });
    this.items.push(joinButton);
    this.thumbpadTargets.push(joinButton);

    const newButton = new TextbuttonItem({
      text: 'New Room',
      position: { x: 100, y: 216 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () => this.createAndJoinNewRoom(),
    });
    this.items.push(newButton);
    this.thumbpadTargets.push(newButton);

    this.redrawMenu();
  }

  private createAndJoinNewRoom() {
    useCollaborationSessionStore.getState().hostRoom();
  }
}
