import * as THREE from 'three';
import TextTexture from '../../vr-helpers/text-texture';

const SIZE_PER_PIXEL = 1 / 500;

export default class NameTagSprite extends THREE.Sprite {
  constructor(username: string, color: THREE.Color) {
    super();

    // Write username into a texture.
    const texture = new TextTexture({
      text: username,
      textColor: color,
      fontSize: 30,
      fontFamily: 'arial',
      padding: 20,
      backgroundColor: new THREE.Color(0x444444),
      backgroundOpacity: 0.8,
    });

    // Set drawn texture as background.
    this.material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
    });

    // Scale name tag.
    this.scale.set(
      texture.image.width * SIZE_PER_PIXEL,
      texture.image.height * SIZE_PER_PIXEL,
      1.0,
    );
  }
}
