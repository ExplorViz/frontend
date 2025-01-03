import Service from '@ember/service';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { ActionIconTextures } from 'explorviz-frontend/utils/extended-reality/view-objects/vr/action-icon';
import { CloseIconTextures } from 'explorviz-frontend/utils/extended-reality/view-objects/vr/close-icon';
// import { useVrAssetRepoStore } from 'react-lib/src/stores/extended-reality/vr-asset-repo';

export default class VrAssetRepository extends Service {
  // TODO: Wait until required utils are migrated

  closeIconTextures!: CloseIconTextures;

  // get closeIconTextures(): CloseIconTextures {
  //   return useVrAssetRepoStore.getState().closeIconTextures;
  // }

  // set closeIconTextures(value: CloseIconTextures) {
  //   useVrAssetRepoStore.setState({ closeIconTextures: value });
  // }

  shareIconTextures!: ActionIconTextures;

  // get shareIconTextures(): ActionIconTextures {
  //   return useVrAssetRepoStore.getState().shareIconTextures;
  // }

  // set shareIconTextures(value: ActionIconTextures) {
  //   useVrAssetRepoStore.setState({ shareIconTextures: value });
  // }

  paintbrushIconTextures!: ActionIconTextures;

  // get paintbrushIconTextures(): ActionIconTextures {
  //   return useVrAssetRepoStore.getState().paintbrushIconTextures;
  // }

  // set paintbrushIconTextures(value: ActionIconTextures) {
  //   useVrAssetRepoStore.setState({ paintbrushIconTextures: value });
  // }

  fireIconTextures!: ActionIconTextures;

  // get fireIconTextures(): ActionIconTextures {
  //   return useVrAssetRepoStore.getState().fireIconTextures;
  // }

  // set fireIconTextures(value: ActionIconTextures) {
  //   useVrAssetRepoStore.setState({ fireIconTextures: value });
  // }

  font: Font | undefined;

  // get font(): Font | undefined {
  //   return useVrAssetRepoStore.getState().font;
  // }

  // set font(value: Font | undefined) {
  //   useVrAssetRepoStore.setState({ font: value });
  // }

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
    'extended-reality/vr-asset-repo': VrAssetRepository;
  }
}
