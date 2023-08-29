// @ts-ignore because three mesh ui's typescript support is not fully matured
import { setOwner } from '@ember/application';
import { getOwner } from '@ember/application';
import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import { UiMenuArgs } from './ui-menu';
import * as THREE from 'three';
import InteractiveMenu from './interactive-menu';
import KeyboardMesh from '../view-objects/vr/keyboard-mesh';
import SearchList from '../view-objects/vr/search-list';
import VRController from '../vr-controller';
import VRControllerThumbpadBinding, {
  thumbpadDirectionToVector2,
} from '../vr-controller/vr-controller-thumbpad-binding';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import ApplicationSearchLogic from 'explorviz-frontend/utils/application-search-logic';

export type SearchMenuArgs = UiMenuArgs & {
  owner: any;
  renderer: THREE.WebGLRenderer;
};

export type searchItemVal = { id: string; applicationId: string };

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

export default class SearchMenu extends InteractiveMenu {
  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  container!: ThreeMeshUI.Block;
  userText!: ThreeMeshUI.Text;
  keyboard!: ThreeMeshUI.Keyboard;
  owner: any;
  renderer: THREE.WebGLRenderer;
  list!: any[];
  searchListContainer!: ThreeMeshUI.Block;
  keyboardContainer!: ThreeMeshUI.Block;
  searchList!: SearchList;
  _isNewInput: boolean = false;
  oldContent?: string;
  searchLogic!: ApplicationSearchLogic;

  constructor({ owner, renderer, ...args }: SearchMenuArgs) {
    super(args);
    this.owner = owner;
    setOwner(this, owner);
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;
    this.searchLogic = new ApplicationSearchLogic(getOwner(this));
    this.makeUI();
    this.makeKeyboard();
  }

  async makeUI() {
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

    const textPanel = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.2,
      offset: 0.001,
      backgroundOpacity: 0,
    });

    this.container.add(textPanel);

    const title = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.045,
      justifyContent: 'center',
      offset: 0.02,
    }).add(
      new ThreeMeshUI.Text({
        content: 'Type in the component you are looking for',
      })
    );
    this.userText = new ThreeMeshUI.Text({
      content: '',
      fontColor: new THREE.Color('black'),
    });

    const textField = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.033,
      padding: 0.02,
      backgroundColor: new THREE.Color('white'),
      offset: 0.001,
    }).add(this.userText);

    textPanel.add(title, textField);

    this.list = this.searchLogic.getPossibleEntityNames(this.userText.content);
    this.searchListContainer = new ThreeMeshUI.Block({
      hiddenOverflow: true,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundColor: new THREE.Color('#777777'),
      backgroundOpacity: 0.6,
    });
    this.searchList = new SearchList({
      owner: this.owner,
      items: this.list,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundOpacity: 0,
    });
    this.searchListContainer.add(this.searchList);
    this.container.add(this.searchListContainer);

    this.container.position.y += 0.09;
    this.container.position.z -= 0.1;
  }

  makeKeyboard() {
    this.keyboard = new KeyboardMesh({
      userText: this.userText,
      language: 'de',
      fontFamily: '/images/keyboard/Roboto-msdf.json', //FontJSON,
      fontTexture: '/images/keyboard/Roboto-msdf.png', //FontImage,
      fontSize: 0.035, // fontSize will propagate to the keys blocks
      backgroundColor: new THREE.Color(colors.keyboardBack),
      backgroundOpacity: 1,
      backspaceTexture: '/images/keyboard/backspace.png',
      shiftTexture: '/images/keyboard/shift.png',
      enterTexture: '/images/keyboard/enter.png',
    });

    this.keyboard.rotation.x = -0.55;
    this.add(this.keyboard);
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    ThreeMeshUI.update();

    if (this.oldContent === this.userText.content) {
      return;
    }

    this.oldContent = this.userText.content;

    this.list = this.searchLogic.getPossibleEntityNames(this.userText.content);
    this.searchList.clear(); // needed before removing, otherwise ThreeMeshUI throws an error
    this.searchListContainer.remove(this.searchList);
    this.searchList = new SearchList({
      owner: this.owner,
      items: this.list,
      width: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.width,
      height: BLOCK_OPTIONS_SEARCHLIST_CONTAINER.height,
      offset: 0.001,
      backgroundOpacity: 0,
    });
    this.searchListContainer.add(this.searchList);
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

          if (this.searchList && this.list.length > 0) {
            const direction = VRControllerThumbpadBinding.getDirection(axes);
            const vector = thumbpadDirectionToVector2(direction);
            const offset = vector.toArray()[1]; // vertical part

            if (offset !== 0) {
              //up
              if (offset === -1) {
                this.searchList.position.y += offset * 0.01;
              }
              //down
              if (offset === 1) {
                this.searchList.position.y += offset * 0.01;
              }
            }
          }
        },
      }
    );
  }
}
