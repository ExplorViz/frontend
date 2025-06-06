import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import TextItem from 'explorviz-frontend/src/utils/extended-reality/vr-menus/items/text-item';
import DisableInputMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-less-menu/disable-input-menu';
import UiMenu, {
  DEFAULT_MENU_RESOLUTION,
  SIZE_RESOLUTION_FACTOR,
  UiMenuArgs,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import RemoteUser from 'explorviz-frontend/src/utils/collaboration/remote-user';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useVrMenuFactoryStore } from 'explorviz-frontend/src/stores/extended-reality/vr-menu-factory';

export type SpectateMenuArgs = UiMenuArgs & {
  remoteUser: RemoteUser;
};

const HEIGHT = 60;

export default class SpectateMenu extends UiMenu {
  private remoteUser: RemoteUser;

  private disableInputMenu: DisableInputMenu;

  constructor({
    resolution = {
      width: DEFAULT_MENU_RESOLUTION,
      height: HEIGHT,
    },
    ...args
  }: SpectateMenuArgs) {
    super({ resolution });

    this.remoteUser = args.remoteUser;

    this.disableInputMenu = useVrMenuFactoryStore
      .getState()
      .buildDisableInputMenu();
  }

  /**
   * Creates the geometry of the background mesh.
   */
  makeBackgroundGeometry() {
    const geometry = super.makeBackgroundGeometry();
    geometry.translate(
      0,
      ((HEIGHT - DEFAULT_MENU_RESOLUTION) / 2) * SIZE_RESOLUTION_FACTOR,
      0
    );
    return geometry;
  }

  onOpenMenu() {
    super.onOpenMenu();

    // Disable input for the other controller.
    const controller = VRController.findController(this);
    const otherController =
      controller === useLocalUserStore.getState().controller1
        ? useLocalUserStore.getState().controller2
        : useLocalUserStore.getState().controller1;
    otherController?.menuGroup?.openMenu(this.disableInputMenu);

    // Activate spectating.
    // Before:
    // useSpectateUserStore.getState().activate(this.remoteUser);
    useSpectateUserStore.getState().activate(this.remoteUser);

    // Show spectating user.
    const textItem = new TextItem({
      text: 'Spectating ',
      color: '#ffffff',
      fontSize: 28,
      alignment: 'right',
      position: { x: 256, y: 20 },
    });
    this.items.push(textItem);

    const userNameItem = new TextItem({
      text: this.remoteUser.userName,
      color: `#${this.remoteUser.color.getHexString()}`,
      fontSize: 28,
      alignment: 'left',
      position: { x: 256, y: 20 },
    });
    this.items.push(userNameItem);

    this.redrawMenu();
  }

  onCloseMenu() {
    super.onCloseMenu();
    useSpectateUserStore.getState().deactivate();
    this.disableInputMenu?.closeMenu();
  }
}
