import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import UserListItem, { BLOCK_OPTIONS_LIST_ITEM } from './user-list-item';
import LocalUser from 'collaborative-mode/services/local-user';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { setOwner } from '@ember/application';
export type UserListArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
  users: Set<string>;
};

export default class UserList extends ThreeMeshUI.Block {

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;
  
  owner: any;
  users: Set<string>;

  constructor({
    owner,
    users,
    ...options
  }: UserListArgs) {
    super(options);
    this.owner = owner;
    setOwner(this, owner);
    this.users = users;
    

    const listItemOptions = {
      width: options.width,
      height: BLOCK_OPTIONS_LIST_ITEM.height,
      offset: 0.001,
      backgroundOpacity: 0,
    };


    const userName = this.localUser.userName || "unknown";
    const userId = this.localUser.userId;

    const firstItem = new UserListItem({
      owner: this.owner,
      userName: userName + " (YOU)",
      userId: userId,
      ...listItemOptions,
    });
    this.add(firstItem);

    this.users.forEach((userId) => {
      const userName = this.collaborationSession.lookupRemoteUserById(userId)?.userName;
      const item = new UserListItem({
        owner: this.owner,
        userName: userName || "unknown",
        userId: userId,
        ...listItemOptions,
      });
      this.add(item);
    });
  }
}
