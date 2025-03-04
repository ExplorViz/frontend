// import SpectateUser from 'explorviz-frontend/services/collaboration/spectate-user';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';

import VRControllerButtonBinding from 'react-lib/src/utils/extended-reality/vr-controller/vr-controller-button-binding';
import TextbuttonItem from 'react-lib/src/utils/extended-reality/vr-menus/items/textbutton-item';
import TitleItem from 'react-lib/src/utils/extended-reality/vr-menus/items/title-item';
import ConnectionBaseMenu from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/base';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { UiMenuArgs } from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useVrMenuFactoryStore } from 'react-lib/src/stores/extended-reality/vr-menu-factory';

// TODO: Remove because variables of stores aren't used anymore
// type OnlineMenuArgs = UiMenuArgs & {
//   spectateUserService: SpectateUser;
// };

export default class OnlineMenu extends ConnectionBaseMenu {
  // THIS MENU WON'T BE USED AT THE MOMENT AND GOT REPLACED BY OnlineMenu2
  private remoteUserButtons: Map<string, TextbuttonItem>;

  // private spectateUserService: SpectateUser;

  private disconnectButton?: TextbuttonItem;

  constructor({ ...args }: UiMenuArgs) {
    super(args);

    this.remoteUserButtons = new Map<string, TextbuttonItem>();

    this.initMenu();
  }

  /**
   * It is possible to interact with this menu while spectating another user
   * such that spectator mode can be disabled.
   */
  get enableTriggerInSpectorMode() {
    return true;
  }

  private initMenu() {
    const users = Array.from(
      useCollaborationSessionStore.getState().getAllRemoteUsers()
    );
    const title = new TitleItem({
      text: `Room ${useCollaborationSessionStore.getState().currentRoomId}`,
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    this.disconnectButton = new TextbuttonItem({
      text: 'Disconnect',
      position: { x: 370, y: 13 },
      width: 115,
      height: 40,
      fontSize: 22,
      buttonColor: '#aaaaaa',
      textColor: '#ffffff',
      hoverColor: '#dc3b00',
      onTriggerDown: () => useCollaborationSessionStore.getState().disconnect(),
    });
    this.items.push(this.disconnectButton);

    const yOffset = 60;
    let yPos = 50 + yOffset;

    const localUserButton = new TextbuttonItem({
      text: `${useLocalUserStore.getState().userName} (you)`,
      position: { x: 100, y: yPos },
      width: 316,
      height: 50,
      fontSize: 28,
    });
    this.items.push(localUserButton);
    this.thumbpadTargets.push(localUserButton);
    yPos += yOffset;

    users.forEach((user) => {
      const remoteUserButton = new TextbuttonItem({
        text: user.userName,
        position: { x: 100, y: yPos },
        width: 316,
        height: 50,
        fontSize: 28,
        onTriggerDown: () =>
          this.menuGroup?.openMenu(
            useVrMenuFactoryStore.getState().buildSpectateMenu(user)
          ),
      });
      this.remoteUserButtons.set(user.userId, remoteUserButton);
      this.items.push(remoteUserButton);
      this.thumbpadTargets.push(remoteUserButton);
      yPos += yOffset;
    });
    this.items.push(title);

    this.redrawMenu();
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    if (
      !this.arrayEquals(
        Array.from(
          useCollaborationSessionStore.getState().getAllRemoteUserIds()
        ),
        Array.from(this.remoteUserButtons.keys())
      )
    ) {
      this.items.clear();
      this.thumbpadTargets.clear();
      this.initMenu();
    }
  }

  private arrayEquals(a: string[], b: string[]) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Disconnect', {
      onButtonDown: () => {
        this.disconnectButton?.enableHoverEffectByButton();
        this.redrawMenu();
      },
      onButtonUp: () => {
        useCollaborationSessionStore.getState().disconnect();
        this.menuGroup?.replaceMenu(
          useVrMenuFactoryStore.getState().buildConnectionMenu()
        );
      },
    });
  }

  onCloseMenu() {
    super.onCloseMenu();
    useSpectateUserStore.getState().deactivate();
  }
}
