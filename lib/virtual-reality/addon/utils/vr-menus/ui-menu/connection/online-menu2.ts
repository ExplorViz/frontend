// @ts-ignore because three mesh ui's typescript support is not fully matured
import { setOwner } from '@ember/application';
import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import UserList from 'virtual-reality/utils/view-objects/vr/user-list';
import { UiMenuArgs } from '../../ui-menu';
import VRControllerThumbpadBinding, { thumbpadDirectionToVector2 } from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VRController from 'virtual-reality/utils/vr-controller';
import InteractiveMenu from '../../interactive-menu';

export type UserMenuArgs = UiMenuArgs & {
  owner: any;
  renderer: THREE.WebGLRenderer;
};

const BLOCK_OPTIONS_CONTAINER = {
  width: 0.8,
  height: 1.2,
  fontFamily: '/images/keyboard/custom-msdf.json',
  fontTexture: '/images/keyboard/custom.png',
};

const BLOCK_OPTIONS_SEARCHLIST_CONTAINER = {
  width: BLOCK_OPTIONS_CONTAINER.width,
  height: 0.3,
};

const colors = {
  keyboardBack: 0x858585,
  panelBack: 0x262626,
  button: 0x363636,
  hovered: 0x1c1c1c,
  selected: 0x109c5d,
};

export default class OnlineMenu2 extends InteractiveMenu {
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  container!: ThreeMeshUI.Block;
  userText!: ThreeMeshUI.Text;
  owner: any;
  renderer: THREE.WebGLRenderer;
  remoteUsers!: Set<string>;
  userListContainer!: ThreeMeshUI.Block;
  keyboardContainer!: ThreeMeshUI.Block;
  userList!: UserList;

  constructor({ owner, renderer, ...args }: UserMenuArgs) {
    super(args);
    this.owner = owner;
    setOwner(this, owner);
    this.renderer = renderer;
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
      backgroundOpacity: 0,
      offset: -0.001,
    });

    this.add(this.container);
   
    this.remoteUsers = new Set<string>(this.collaborationSession.getAllRemoteUserIds());
    this.userListContainer = new ThreeMeshUI.Block({
      hiddenOverflow: true,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0.6,
    });
    this.userList = new UserList({
      owner: this.owner,
      users: this.remoteUsers,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundOpacity: 0,
    });
    this.userListContainer.add(this.userList);
    this.container.add(this.userListContainer);

    this.container.position.y += 0.09;
    this.container.position.z -= 0.1;
  }
  
  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    ThreeMeshUI.update();
  }

  /**
   * The thumbpad can be used to select a searched item
   */
  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Scroll up', labelDown: 'Scroll down' },
      {
        onThumbpadTouch: (controller: VRController, axes: number[]) => {
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
