import LocalUser from 'collaboration/services/local-user';
import RemoteUser from 'collaboration/utils/remote-user';
import SpectateUser from 'collaboration/services/spectate-user';
import VRController from 'extended-reality/utils/vr-controller';
import TextItem from '../../items/text-item';
import DisableInputMenu from '../../ui-less-menu/disable-input-menu';
import UiMenu, {
  DEFAULT_MENU_RESOLUTION,
  SIZE_RESOLUTION_FACTOR,
  UiMenuArgs,
} from '../../ui-menu';

export type SpectateMenuArgs = UiMenuArgs & {
  localUser: LocalUser;
  remoteUser: RemoteUser;
  spectateUserService: SpectateUser;
};

const HEIGHT = 60;

export default class SpectateMenu extends UiMenu {
  private localUser: LocalUser;

  private remoteUser: RemoteUser;

  private spectateUserService: SpectateUser;

  private disableInputMenu: DisableInputMenu;

  constructor({
    localUser,
    spectateUserService,
    remoteUser,
    resolution = {
      width: DEFAULT_MENU_RESOLUTION,
      height: HEIGHT,
    },
    ...args
  }: SpectateMenuArgs) {
    super({ resolution, ...args });

    this.localUser = localUser;
    this.spectateUserService = spectateUserService;
    this.remoteUser = remoteUser;

    this.disableInputMenu = this.menuFactory.buildDisableInputMenu();
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
      controller === this.localUser.controller1
        ? this.localUser.controller2
        : this.localUser.controller1;
    otherController?.menuGroup?.openMenu(this.disableInputMenu);

    // Activate spectating.
    this.spectateUserService.activate(this.remoteUser);

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
    this.spectateUserService.deactivate();
    this.disableInputMenu?.closeMenu();
  }
}
