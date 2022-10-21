import * as THREE from 'three';
import HudMenu from '../../hud-menu';
import TextItem from '../../items/text-item';
import { UiMenuArgs } from '../../ui-menu';

const OPEN_ANIMATION_CLIP = new THREE.AnimationClip('open-animation', 0.25, [
  new THREE.KeyframeTrack('.position[y]', [0.0, 0.25], [0.2, 0.0]),
]);

const CLOSE_ANIMATION_CLIP = new THREE.AnimationClip('close-animation', 0.25, [
  new THREE.KeyframeTrack('.position[y]', [0.0, 0.25], [0.0, 0.2]),
]);

export type MessageBoxMenuArgs = UiMenuArgs & {
  title: string;
  text?: string;
  color: string;
  time: number;
};

export default class MessageBoxMenu extends HudMenu {
  private time: number;

  private enableTimer: boolean;

  constructor({
    title,
    text,
    color,
    time,
    resolution = { width: 256, height: 64 },
    backgroundColor = '#000000',
    ...args
  }: MessageBoxMenuArgs) {
    super({ resolution, backgroundColor, ...args });
    this.time = time;
    this.enableTimer = false;

    // Draw text.
    const titleItem = new TextItem({
      text: title,
      color,
      fontSize: 18,
      alignment: 'center',
      position: { x: 128, y: 10 },
    });
    this.items.push(titleItem);

    if (text) {
      const textItem = new TextItem({
        text,
        color,
        fontSize: 14,
        alignment: 'center',
        position: { x: 128, y: 40 },
      });
      this.items.push(textItem);
    } else {
      titleItem.position.y = 21;
      titleItem.fontSize = 22;
    }

    this.redrawMenu();
  }

  makeBackgroundMaterial(color: THREE.Color) {
    const material = super.makeBackgroundMaterial(color);
    material.opacity = 0.7;
    return material;
  }

  onOpenMenu() {
    super.onOpenMenu();
    this.playOpenAnimation();
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    if (this.enableTimer) {
      // Remove menu automatically after `time` seconds.
      this.time -= delta;
      if (this.time <= 0.0) this.playCloseAnimation();
    }
  }

  async playOpenAnimation() {
    const action = this.animationMixer.clipAction(OPEN_ANIMATION_CLIP);
    action.setLoop(THREE.LoopOnce, 0);
    action.play();

    // Start message timer when the open animation finished.
    await this.waitForAnimation(action);
    this.enableTimer = true;
  }

  async playCloseAnimation() {
    const action = this.animationMixer.clipAction(CLOSE_ANIMATION_CLIP);
    action.setLoop(THREE.LoopOnce, 0);
    action.clampWhenFinished = true;
    action.play();

    // Stop timer while the close animation is playing such that the close
    // animation is not triggered multiple times.
    this.enableTimer = false;

    // Close menu when animation finished.
    await this.waitForAnimation(action);
    this.closeMenu();
  }
}
