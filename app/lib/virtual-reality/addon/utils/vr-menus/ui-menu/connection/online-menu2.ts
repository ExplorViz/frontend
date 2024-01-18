// @ts-ignore because three mesh ui's typescript support is not fully matured
import { setOwner } from '@ember/application';
import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import UserList from 'virtual-reality/utils/view-objects/vr/user-list';
import { UiMenuArgs } from '../../ui-menu';
import VRControllerThumbpadBinding, {
  thumbpadDirectionToVector2,
} from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VRController from 'virtual-reality/utils/vr-controller';
import InteractiveMenu from '../../interactive-menu';
import LocalUser from 'collaborative-mode/services/local-user';
import DisconnectButton from 'virtual-reality/utils/view-objects/vr/disconnect-button';

export type UserMenuArgs = UiMenuArgs & {
  owner: any;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
};

const BLOCK_OPTIONS_CONTAINER = {
  width: 0.4,
  height: 0.5,
  fontFamily: '/images/keyboard/custom-msdf.json',
  fontTexture: '/images/keyboard/custom.png',
};

const BLOCK_OPTIONS_DISCONNECT = {
  width: BLOCK_OPTIONS_CONTAINER.width * 0.5,
  height: BLOCK_OPTIONS_CONTAINER.height * 0.1,
};

const BLOCK_OPTIONS_SEARCHLIST_CONTAINER = {
  width: BLOCK_OPTIONS_CONTAINER.width,
  height: BLOCK_OPTIONS_CONTAINER.height - 0.1,
};

export default class OnlineMenu2 extends InteractiveMenu {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;

  container!: ThreeMeshUI.Block;
  userText!: ThreeMeshUI.Text;
  owner: any;
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  remoteUsers!: Set<string>;
  userListContainer!: ThreeMeshUI.Block;
  userList!: UserList;

  constructor({ owner, renderer, scene, ...args }: UserMenuArgs) {
    super(args);
    this.owner = owner;
    setOwner(this, owner);
    this.renderer = renderer;
    this.scene = scene;
    this.renderer.localClippingEnabled = true;

    this.makeUI();
  }

  makeUI() {
    this.container = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: BLOCK_OPTIONS_CONTAINER.height,
      fontFamily: BLOCK_OPTIONS_CONTAINER.fontFamily,
      fontTexture: BLOCK_OPTIONS_CONTAINER.fontTexture,
      fontSize: 0.03,
      justifyContent: 'start',
      //backgroundOpacity: 0,
      offset: -0.001,
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0.6,
    });

    this.add(this.container);
    this.container.position.y += 0.1;

    const titleBlock = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.05,
      justifyContent: 'center',
      textAlign: 'center',
      offset: 0.02,
    });

    const title = new ThreeMeshUI.Text({
      content: `Room ${this.collaborationSession.currentRoomId}`,
      fontColor: new THREE.Color('#ffffff'),
    });

    titleBlock.add(title);

    this.remoteUsers = new Set<string>(
      this.collaborationSession.getAllRemoteUserIds()
    );

    this.userListContainer = new ThreeMeshUI.Block({
      hiddenOverflow: true,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0,
    });

    this.container.add(this.userListContainer);
    this.userListContainer.add(titleBlock);
    const disconnect = new DisconnectButton({
      owner: this.owner,
      ...BLOCK_OPTIONS_DISCONNECT,
      offset: 0.02,
      backgroundOpacity: 0.6,
      margin: 0.01,
      backgroundColor: new THREE.Color('red'),
    });
    this.container.add(disconnect);
    this.updateUI();
  }

  updateUI() {
    this.userList = new UserList({
      menu: this,
      owner: this.owner,
      users: this.remoteUsers,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundOpacity: 0,
    });
    this.userListContainer.add(this.userList);
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    ThreeMeshUI.update();

    if (
      !this.arrayEquals(
        Array.from(this.collaborationSession.getAllRemoteUserIds()),
        Array.from(this.remoteUsers) //this.remoteUserButtons.keys())
      )
    ) {
      this.remoteUsers = new Set<string>(
        this.collaborationSession.getAllRemoteUserIds()
      );

      this.userListContainer.remove(this.userList);
      this.userList.clear();
      this.updateUI();
    }
  }

  private arrayEquals(a: string[], b: string[]) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  openSpectateViewMenu(userId: string) {
    this.menuGroup?.replaceMenu(this.menuFactory.buildSpectateViewMenu(userId));
  }

  /**
   * The thumbpad can be used to select a searched item
   */
  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Scroll up', labelDown: 'Scroll down' },
      {
        onThumbpadTouch: (_controller: VRController, axes: number[]) => {
          // controller.updateIntersectedObject();
          //if (!controller.intersectedObject) return;

          if (this.userList && this.remoteUsers.size > 0) {
            const direction = VRControllerThumbpadBinding.getDirection(axes);
            const vector = thumbpadDirectionToVector2(direction);
            const offset = vector.toArray()[1]; // vertical part

            if (offset !== 0) {
              //up
              if (offset === -1) {
                this.userList.position.y += offset * 0.01;
              }
              //down
              if (offset === 1) {
                this.userList.position.y += offset * 0.01;
              }
            }
          }
        },
      }
    );
  }
}
