import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/utils/extended-reality/vr-helpers/detail-info-composer';
import { Texture, TextureLoader } from 'three';
import Service from '@ember/service';

export enum TextureNameConstants {
  ADDED = 'plus',
  DELETED = 'minus',
  MODIFIED = 'hashtag',
}

export default class TextureService extends Service {
  private _textureCache: Map<string, Texture> = new Map();

  private loader = new TextureLoader();

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
        this._textureCache.set(texturePath, texture);
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
