import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import UserListItem, { BLOCK_OPTIONS_LIST_ITEM } from './user-list-item';
import LocalUser from 'collaborative-mode/services/local-user';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { setOwner } from '@ember/application';
import OnlineMenu2 from 'extended-reality/utils/vr-menus/ui-menu/connection/online-menu2';
export type UserListArgs = ThreeMeshUI.BlockOptions & {
  menu: OnlineMenu2;
  owner: any;
  users: Set<string>;
};

export default class UserList extends ThreeMeshUI.Block {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;

  menu: OnlineMenu2;
  owner: any;
  users: Set<string>;

  constructor({ menu, owner, users, ...options }: UserListArgs) {
    super(options);
    this.menu = menu;
    this.owner = owner;
    setOwner(this, owner);
    this.users = users;

    const listItemOptions = {
      width: options.width,
      height: BLOCK_OPTIONS_LIST_ITEM.height,
      offset: 0.001,
      backgroundOpacity: 0,
    };

    const userName = this.localUser.userName || 'unknown';
    const userId = this.localUser.userId;

    const firstItem = new UserListItem({
      menu: this.menu,
      owner: this.owner,
      userName: userName + ' (YOU)',
      userId: userId,
      ...listItemOptions,
    });
    this.add(firstItem);

    this.users.forEach((userId) => {
      const userName =
        this.collaborationSession.lookupRemoteUserById(userId)?.userName;
      const item = new UserListItem({
        menu: this.menu,
        owner: this.owner,
        userName: userName || 'unknown',
        userId: userId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
