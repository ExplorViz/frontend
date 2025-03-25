// @ts-ignore because three mesh ui's typescript support is not fully matured
import ThreeMeshUI from 'three-mesh-ui';
import * as THREE from 'three';
import UserList from 'react-lib/src/utils/extended-reality/view-objects/vr/user-list';
import { UiMenuArgs } from 'react-lib/src/utils/extended-reality/vr-menus/ui-menu';
import VRControllerThumbpadBinding, {
  thumbpadDirectionToVector2,
} from 'react-lib/src/utils/extended-reality/vr-controller/vr-controller-thumbpad-binding';
import VRController from 'react-lib/src/utils/extended-reality/vr-controller';
import InteractiveMenu from 'react-lib/src/utils/extended-reality/vr-menus/interactive-menu';
import DisconnectButton from 'react-lib/src/utils/extended-reality/view-objects/vr/disconnect-button';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useVrMenuFactoryStore } from 'react-lib/src/stores/extended-reality/vr-menu-factory';

export type UserMenuArgs = UiMenuArgs & {
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
  container!: ThreeMeshUI.Block;
  userText!: ThreeMeshUI.Text;
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  remoteUsers!: Set<string>;
  userListContainer!: ThreeMeshUI.Block;
  userList!: UserList;

  constructor({ renderer, scene }: UserMenuArgs) {
    super();
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
      content: `Room ${useCollaborationSessionStore.getState().currentRoomId}`,
      fontColor: new THREE.Color('#ffffff'),
    });

    titleBlock.add(title);

    this.remoteUsers = new Set<string>(
      useCollaborationSessionStore.getState().getAllRemoteUserIds()
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
        Array.from(
          useCollaborationSessionStore.getState().getAllRemoteUserIds()
        ),
        Array.from(this.remoteUsers) //this.remoteUserButtons.keys())
      )
    ) {
      this.remoteUsers = new Set<string>(
        useCollaborationSessionStore.getState().getAllRemoteUserIds()
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
    this.menuGroup?.replaceMenu(
      useVrMenuFactoryStore.getState().buildSpectateViewMenu(userId)
    );
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
