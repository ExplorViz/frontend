import CollaborationSession, { ConnectionStatus } from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import UiMenu, { UiMenuArgs } from '../../ui-menu';

export type ConnectionBaseMenuArgs = UiMenuArgs & {
  collaborationSession: CollaborationSession;
  localUser: LocalUser;
};

export default abstract class ConnectionBaseMenu extends UiMenu {
  private initialConnectionStatus: ConnectionStatus;

  readonly collaborationSession: CollaborationSession;

  readonly localUser: LocalUser;

  constructor({ collaborationSession, localUser, ...args }: ConnectionBaseMenuArgs) {
    super(args);
    this.collaborationSession = collaborationSession;
    this.localUser = localUser;
    this.initialConnectionStatus = collaborationSession.connectionStatus;
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    // When the connection status of the user changed, open the
    // corresponding connection menu.
    if (this.collaborationSession.connectionStatus !== this.initialConnectionStatus) {
      this.menuGroup?.replaceMenu(this.menuFactory.buildConnectionMenu());
    }
  }
}
