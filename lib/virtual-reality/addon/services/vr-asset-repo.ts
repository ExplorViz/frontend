import Service from '@ember/service';
import THREE from 'three';
import { ActionIconTextures } from 'virtual-reality/utils/view-objects/vr/action-icon';
import { CloseIconTextures } from 'virtual-reality/utils/view-objects/vr/close-icon';

export default class VrAssetRepository extends Service {
  closeIconTextures!: CloseIconTextures;

  shareIconTextures!: ActionIconTextures;

  paintbrushIconTextures!: ActionIconTextures;

  fireIconTextures!: ActionIconTextures;

  font: THREE.Font | undefined;

  init() {
    super.init();

    // Load texture for the close button.
    const textureLoader = new THREE.TextureLoader();
    this.closeIconTextures = {
      defaultTexture: textureLoader.load('images/x_white_transp.png'),
      hoverTexture: textureLoader.load('images/x_white.png'),
    };

    this.shareIconTextures = {
      defaultTexture: textureLoader.load('images/share.png'),
      hoverTexture: textureLoader.load('images/share.png'),
    };

    this.paintbrushIconTextures = {
      defaultTexture: textureLoader.load('images/paintbrush.png'),
      hoverTexture: textureLoader.load('images/paintbrush.png'),
    };

    this.fireIconTextures = {
      defaultTexture: textureLoader.load('images/fire_transp.png'),
      hoverTexture: textureLoader.load('images/fire.png'),
    };
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-asset-repo': VrAssetRepository;
  }
}
