// @ts-ignore
import UiMenu, { UiMenuArgs } from './ui-menu';
import ThreeMeshUI from 'three-mesh-ui';

import * as THREE from 'three';
import InteractiveMenu from './interactive-menu';
import KeyboardMesh from '../view-objects/vr/keyboard-mesh';

export type SearchMenuArgs = UiMenuArgs; /*& {
    ...
};*/

const BLOCK_OPTIONS_CONTAINER = {
  width: 0.8,
  height: 0.8,
  fontFamily: '/images/keyboard/custom-msdf.json',
  fontTexture: '/images/keyboard/custom.png',
};

const colors = {
  keyboardBack: 0x858585,
  panelBack: 0x262626,
  button: 0x363636,
  hovered: 0x1c1c1c,
  selected: 0x109c5d,
};

const objsToTest = [];

export default class SearchMenu extends InteractiveMenu {
  container!: ThreeMeshUI.Block;
  userText: ThreeMeshUI.Text;
  keyboard!: ThreeMeshUI.Keyboard;

  constructor({ ...args /*, list of non UIMenuArgs */ }: SearchMenuArgs) {
    super(args);

    //new ThreeMeshUI.Text( { content: '' , fontSize: 0.055} );

    this.makeUI();
    this.makeKeyboard();
  }

  makeUI() {
    this.container = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: BLOCK_OPTIONS_CONTAINER.height,
      fontFamily: BLOCK_OPTIONS_CONTAINER.fontFamily,
      fontTexture: BLOCK_OPTIONS_CONTAINER.fontTexture,
      fontSize: 0.03,
      justifyContent: 'start',
      backgroundColor: new THREE.Color('red'),
      backgroundOpacity: 0.6,
    });

    this.add(this.container);

    const textPanel = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.2,
      backgroundColor: new THREE.Color('blue'),
    });

    this.container.add(textPanel);

    const title = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.045,
      justifyContent: 'center',
      backgroundColor: new THREE.Color('green'),
    }).add(new ThreeMeshUI.Text({ content: 'Type some text on the keyboard' }));

    this.userText = new ThreeMeshUI.Text({ content: 'Text to be displayed' });

    const textField = new ThreeMeshUI.Block({
      width: BLOCK_OPTIONS_CONTAINER.width,
      height: 0.1,
      fontSize: 0.033,
      padding: 0.02,
      backgroundColor: new THREE.Color('yellow'),
    }).add(this.userText);

    textPanel.add(title, textField);
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

    this.container.add(this.keyboard);
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);
    ThreeMeshUI.update();
  }
}
