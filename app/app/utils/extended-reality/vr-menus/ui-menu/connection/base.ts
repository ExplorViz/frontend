import CollaborationSession, {
  ConnectionStatus,
} from 'explorviz-frontend/services/collaboration/collaboration-session';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import UiMenu, {
  UiMenuArgs,
} from 'explorviz-frontend/utils/extended-reality/vr-menus/ui-menu';

export type ConnectionBaseMenuArgs = UiMenuArgs & {
  collaborationSession: CollaborationSession;
  localUser: LocalUser;
};

export default abstract class ConnectionBaseMenu extends UiMenu {
  private initialConnectionStatus: ConnectionStatus;

  readonly collaborationSession: CollaborationSession;

  readonly localUser: LocalUser;

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
      this.collaborationSession.connectionStatus !==
      this.initialConnectionStatus
    ) {
      this.menuGroup?.replaceMenu(this.menuFactory.buildConnectionMenu());
    }
  }
}
