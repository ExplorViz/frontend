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

export type ConnectionBaseMenuArgs = UiMenuArgs & {
  // collaborationSession: CollaborationSession;
  collaborationSession: typeof useCollaborationSessionStore; // TODO: does this work?
  // localUser: LocalUser;
  localUser: typeof useLocalUserStore; // TODO: does this work?
};

export default abstract class ConnectionBaseMenu extends UiMenu {
  private initialConnectionStatus: ConnectionStatus;

  // readonly collaborationSession: CollaborationSession;
  readonly collaborationSession: typeof useCollaborationSessionStore; // TODO: does this work?

  // readonly localUser: LocalUser;
  readonly localUser: typeof useLocalUserStore; // TODO: does this work?
  constructor({
    collaborationSession,
    localUser,
    ...args
  }: ConnectionBaseMenuArgs) {
    super(args);
    this.collaborationSession = collaborationSession;
    this.localUser = localUser;
    this.initialConnectionStatus = collaborationSession.connectionStatus;
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    // When the connection status of the user changed, open the
    // corresponding connection menu.
    if (
      useCollaborationSessionStore.getState().connectionStatus !==
      this.initialConnectionStatus
    ) {
      this.menuGroup?.replaceMenu(this.menuFactory.buildConnectionMenu());
    }
  }
}
