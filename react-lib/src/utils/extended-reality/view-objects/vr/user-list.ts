import ThreeMeshUI from 'three-mesh-ui';
import UserListItem, {
  BLOCK_OPTIONS_LIST_ITEM,
} from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/user-list-item';
import OnlineMenu2 from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/connection/online-menu2';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';

export type UserListArgs = ThreeMeshUI.BlockOptions & {
  menu: OnlineMenu2;
  users: Set<string>;
};

export default class UserList extends ThreeMeshUI.Block {
  menu: OnlineMenu2;
  users: Set<string>;

  constructor({ menu, users, ...options }: UserListArgs) {
    super(options);
    this.menu = menu;
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
      userName: userName + ' (YOU)',
      userId: userId,
      ...listItemOptions,
    });
    this.add(firstItem);

    this.users.forEach((userId) => {
      const userName = useCollaborationSessionStore
        .getState()
        .lookupRemoteUserById(userId)?.userName;
      const item = new UserListItem({
        menu: this.menu,
        userName: userName || 'unknown',
        userId: userId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
