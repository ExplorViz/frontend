import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import UiMenu, {
  UiMenuArgs,
} from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu';
import {
  useCollaborationSessionStore,
  ConnectionStatus,
} from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useVrMenuFactoryStore } from 'explorviz-frontend/src/stores/extended-reality/vr-menu-factory';

export default abstract class ConnectionBaseMenu extends UiMenu {
  private initialConnectionStatus: ConnectionStatus;
  constructor({ ...args }: UiMenuArgs) {
    super(args);
    this.initialConnectionStatus =
      useCollaborationSessionStore.getState().connectionStatus;
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    // When the connection status of the user changed, open the
    // corresponding connection menu.
    if (
      useCollaborationSessionStore.getState().connectionStatus !==
      this.initialConnectionStatus
    ) {
      this.menuGroup?.replaceMenu(
        useVrMenuFactoryStore.getState().buildConnectionMenu()
      );
    }
  }
}
