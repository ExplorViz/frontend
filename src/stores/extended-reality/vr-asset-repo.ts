import { create } from 'zustand';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader.js';
import * as THREE from 'three';
import { ActionIconTextures } from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/action-icon';
import { CloseIconTextures } from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/close-icon';

interface VrAssetRepoState {
  closeIconTextures: CloseIconTextures;
  shareIconTextures: ActionIconTextures;
  paintbrushIconTextures: ActionIconTextures;
  fireIconTextures: ActionIconTextures;
  font: Font | undefined;
}

export const useVrAssetRepoStore = create<VrAssetRepoState>((set, get) => {
  const textureLoader = new THREE.TextureLoader();

  return {
    closeIconTextures: {
      defaultTexture: textureLoader.load('images/x_white_transp.png'),
      hoverTexture: textureLoader.load('images/x_white.png'),
    },
    shareIconTextures: {
      defaultTexture: textureLoader.load('images/share.png'),
      hoverTexture: textureLoader.load('images/share.png'),
    },
    paintbrushIconTextures: {
      defaultTexture: textureLoader.load('images/paintbrush.png'),
      hoverTexture: textureLoader.load('images/paintbrush.png'),
    },
    fireIconTextures: {
      defaultTexture: textureLoader.load('images/fire_transp.png'),
      hoverTexture: textureLoader.load('images/fire.png'),
    },
    font: undefined,
  };
});
