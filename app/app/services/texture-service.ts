import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import BaseMesh from 'react-lib/src/view-objects/3d/base-mesh.ts';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { Texture, TextureLoader } from 'three';
import Service from '@ember/service';
import { useTextureServiceStore } from 'react-lib/src/stores/texture-service';

export enum TextureNameConstants {
  ADDED = 'plus',
  DELETED = 'minus',
  MODIFIED = 'hashtag',
}

export default class TextureService extends Service {
  // private _textureCache: Map<string, Texture> = new Map();

  get _textureCache(): Map<string, Texture> {
    return useTextureServiceStore.getState()._textureCache;
  }

  set _textureCache(value: Map<string, Texture>) {
    useTextureServiceStore.setState({ _textureCache: value });
  }

  // private loader = new TextureLoader();

  get loader(): TextureLoader {
    return useTextureServiceStore.getState().loader;
  }

  set loader(value: TextureLoader) {
    useTextureServiceStore.setState({ loader: value });
  }

  constructor() {
    super();
    // load all textures
    this.loadTexture(TextureNameConstants.ADDED);
    this.loadTexture(TextureNameConstants.DELETED);
    this.loadTexture(TextureNameConstants.MODIFIED);
  }

  private loadTexture(
    texturePath: string,
    onLoad?: (texture: Texture) => void
  ) {
    const filenamePrefix = '../images/';
    const filenameSuffix = '.png';

    // use callback due to asynchronous nature
    if (this._textureCache.has(texturePath)) {
      if (onLoad) {
        onLoad(this._textureCache.get(texturePath)!);
      }
      return;
    }

    this.loader.load(
      filenamePrefix + texturePath + filenameSuffix,
      (texture) => {
        useTextureServiceStore.getState().addTexture(texturePath, texture);
        // this._textureCache.set(texturePath, texture);
        if (onLoad) {
          onLoad(texture);
        }
      }
    );
  }

  applyAddedTextureToMesh(mesh: BaseMesh | undefined) {
    if (!isEntityMesh(mesh)) {
      return;
    }

    this.loadTexture(TextureNameConstants.ADDED, (loadedTexture) => {
      if (mesh instanceof ClazzCommunicationMesh) {
        const start = mesh.layout.startPoint;
        const end = mesh.layout.endPoint;
        const dist = start.distanceTo(end);
        (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
      } else {
        mesh.changeTexture(loadedTexture);
      }
    });
  }

  applyDeletedTextureToMesh(mesh: BaseMesh | undefined) {
    if (!isEntityMesh(mesh)) {
      return;
    }

    this.loadTexture(TextureNameConstants.DELETED, (loadedTexture) => {
      if (mesh instanceof ClazzCommunicationMesh) {
        const start = mesh.layout.startPoint;
        const end = mesh.layout.endPoint;
        const dist = start.distanceTo(end);
        (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
      } else {
        mesh.changeTexture(loadedTexture);
      }
    });
  }

  applyModifiedTextureToMesh(mesh: BaseMesh | undefined) {
    if (!isEntityMesh(mesh)) {
      return;
    }

    this.loadTexture(TextureNameConstants.MODIFIED, (loadedTexture) => {
      if (mesh instanceof ClazzCommunicationMesh) {
        const start = mesh.layout.startPoint;
        const end = mesh.layout.endPoint;
        const dist = start.distanceTo(end);
        (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
      } else {
        mesh.changeTexture(loadedTexture);
      }
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'texture-service': TextureService;
  }
}
