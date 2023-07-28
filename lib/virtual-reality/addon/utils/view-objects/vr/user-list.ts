import ThreeMeshUI from 'three-mesh-ui';
import SearchListItem, { BLOCK_OPTIONS_LIST_ITEM } from './search-list-item';
import { searchItemVal } from 'virtual-reality/utils/vr-menus/search-menu';
import RemoteUser from 'collaborative-mode/utils/remote-user';
import UserListItem from './user-list-item';

export type UserListArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
  users: Set<string>;
};

export default class UserList extends ThreeMeshUI.Block {
  owner: any;
  users: Set<string>;

  constructor({
    owner,
    users,
    ...options
  }: UserListArgs) {
    super(options);
    this.owner = owner;
    this.users = users;
    
    this.users.forEach((userId) => {
      const listItemOptions = {
        width: options.width,
        height: BLOCK_OPTIONS_LIST_ITEM.height,
        offset: 0.001,
        backgroundOpacity: 0,
      };
      const item = new UserListItem({
        owner: this.owner,
        userId: userId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
