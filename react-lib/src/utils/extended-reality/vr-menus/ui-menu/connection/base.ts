// import CollaborationSession, {
//   ConnectionStatus,
// } from 'explorviz-frontend/services/collaboration/collaboration-session';
// import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import UiMenu, {
  UiMenuArgs,
} from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu';
import {
  useCollaborationSessionStore,
  ConnectionStatus,
} from 'react-lib/src/stores/collaboration/collaboration-session';
import { useVrMenuFactoryStore } from 'react-lib/src/stores/extended-reality/vr-menu-factory';

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
