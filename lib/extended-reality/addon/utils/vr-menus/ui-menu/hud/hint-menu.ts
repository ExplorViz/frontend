import * as THREE from 'three';
import HudMenu from '../../hud-menu';
import TextItem from '../../items/text-item';
import { DEFAULT_MENU_RESOLUTION, UiMenuArgs } from '../../ui-menu';

const OPEN_ANIMATION_CLIP = new THREE.AnimationClip('open-animation', 0.75, [
  new THREE.KeyframeTrack('.scale[x]', [0.0, 0.75], [0.0, 1.0]),
]);

const PULS_ANIMATION_CLIP = new THREE.AnimationClip('puls-animation', 0.25, [
  new THREE.KeyframeTrack('.position[z]', [0, 0.25], [-0.0, -0.015]),
]);

const CLOSE_ANIMATION_CLIP = new THREE.AnimationClip('close-animation', 0.75, [
  new THREE.KeyframeTrack('.scale[x]', [0, 0.75], [1.0, 0.0]),
]);

export type HintMenuArgs = UiMenuArgs & {
  title: string;
  text?: string;
};

export default class HintMenu extends HudMenu {
  readonly titleItem: TextItem;

  readonly textItem: TextItem | undefined;

  constructor({
    title,
    text,
    resolution = {
      width: DEFAULT_MENU_RESOLUTION,
      height: DEFAULT_MENU_RESOLUTION / 4,
    },
    backgroundColor = '#002e4f',
    ...args
  }: HintMenuArgs) {
    super({ resolution, backgroundColor, ...args });

    this.titleItem = new TextItem({
      text: title,
      color: '#ffffff',
      fontSize: 28,
      alignment: 'center',
      position: { x: 256, y: 50 },
    });
    this.items.push(this.titleItem);

    if (text) {
      this.titleItem.position.y = 25;
      this.textItem = new TextItem({
        text,
        color: '#ffff00',
        fontSize: 28,
        alignment: 'center',
        position: { x: 256, y: 75 },
      });
      this.items.push(this.textItem);
    }

    this.redrawMenu();
  }

  makeBackgroundMaterial(color: THREE.Color) {
    const material = super.makeBackgroundMaterial(color);
    material.opacity = 0.7;
    return material;
  }

  async onOpenMenu() {
    super.onOpenMenu();

    // Play open animation.
    const openAction = this.animationMixer.clipAction(OPEN_ANIMATION_CLIP);
    openAction.setLoop(THREE.LoopOnce, 0);
    openAction.play();
    await this.waitForAnimation(openAction);

    // Play puls animation.
    const pulsAction = this.animationMixer.clipAction(PULS_ANIMATION_CLIP);
    pulsAction.setLoop(THREE.LoopPingPong, 4);
    pulsAction.play();
    await this.waitForAnimation(pulsAction);

    // Play close animation.
    const closeAction = this.animationMixer.clipAction(CLOSE_ANIMATION_CLIP);
    closeAction.setLoop(THREE.LoopOnce, 0);
    closeAction.clampWhenFinished = true;
    closeAction.play();
    await this.waitForAnimation(closeAction);

    this.closeMenu();
  }
}
