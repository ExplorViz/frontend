import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import UserListItem, { BLOCK_OPTIONS_LIST_ITEM } from 'react-lib/src/utils/extended-reality/view-objects/vr/user-list-item';
import { setOwner } from '@ember/application';
import OnlineMenu2 from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

export type UserListArgs = ThreeMeshUI.BlockOptions & {
  menu: OnlineMenu2;
  owner: any;
  users: Set<string>;
};

export default class UserList extends ThreeMeshUI.Block {
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

    const userName = useLocalUserStore.getState().userName || 'unknown';
    const userId = useLocalUserStore.getState().userId;

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
        useCollaborationSessionStore.getState().lookupRemoteUserById(userId)?.userName;
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
