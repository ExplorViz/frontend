import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import { Texture, TextureLoader } from 'three';
import { create } from 'zustand';

export enum TextureNameConstants {
  ADDED = 'plus',
  DELETED = 'minus',
  MODIFIED = 'hashtag',
}

interface TextureServiceState {
  _textureCache: Map<string, Texture>;
  loader: TextureLoader;
  _constructor: () => void;
  addTexture: (texturePath: string, texture: Texture) => void;
  _loadTexture: (
    texturePath: string,
    onLoad?: (texture: Texture) => void
  ) => void;
  applyAddedTextureToMesh: (mesh: BaseMesh | undefined) => void;
  applyDeletedTextureToMesh: (mesh: BaseMesh | undefined) => void;
  applyModifiedTextureToMesh: (mesh: BaseMesh | undefined) => void;
}

export const useTextureServiceStore = create<TextureServiceState>(
  (set, get) => ({
    _textureCache: new Map(),
    addTexture,
    loader: new TextureLoader(),

    _constructor: () => {
      get()._loadTexture(TextureNameConstants.ADDED);
      get()._loadTexture(TextureNameConstants.DELETED);
      get()._loadTexture(TextureNameConstants.MODIFIED);
    },

    _loadTexture: (
      texturePath: string,
      onLoad?: (texture: Texture) => void
    ) => {
      const filenamePrefix = '../images/';
      const filenameSuffix = '.png';

      // use callback due to asynchronous nature
      if (get()._textureCache.has(texturePath)) {
        if (onLoad) {
          onLoad(get()._textureCache.get(texturePath)!);
        }
        return;
      }

      get().loader.load(
        filenamePrefix + texturePath + filenameSuffix,
        (texture) => {
          get().addTexture(texturePath, texture);
          if (onLoad) {
            onLoad(texture);
          }
        }
      );
    },

    applyAddedTextureToMesh: (mesh: BaseMesh | undefined) => {
      if (!isEntityMesh(mesh)) {
        return;
      }

      get()._loadTexture(TextureNameConstants.ADDED, (loadedTexture) => {
        if (mesh instanceof ClazzCommunicationMesh) {
          const start = mesh.layout.startPoint;
          const end = mesh.layout.endPoint;
          const dist = start.distanceTo(end);
          (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
        } else {
          mesh.changeTexture(loadedTexture);
        }
      });
    },

    applyDeletedTextureToMesh: (mesh: BaseMesh | undefined) => {
      if (!isEntityMesh(mesh)) {
        return;
      }

      get()._loadTexture(TextureNameConstants.DELETED, (loadedTexture) => {
        if (mesh instanceof ClazzCommunicationMesh) {
          const start = mesh.layout.startPoint;
          const end = mesh.layout.endPoint;
          const dist = start.distanceTo(end);
          (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
        } else {
          mesh.changeTexture(loadedTexture);
        }
      });
    },

    applyModifiedTextureToMesh: (mesh: BaseMesh | undefined) => {
      if (!isEntityMesh(mesh)) {
        return;
      }

      get()._loadTexture(TextureNameConstants.MODIFIED, (loadedTexture) => {
        if (mesh instanceof ClazzCommunicationMesh) {
          const start = mesh.layout.startPoint;
          const end = mesh.layout.endPoint;
          const dist = start.distanceTo(end);
          (mesh as EntityMesh).changeTexture(loadedTexture, Math.ceil(dist), 3);
        } else {
          mesh.changeTexture(loadedTexture);
        }
      });
    },
  })
);

function addTexture(texturePath: string, texture: Texture) {
  useTextureServiceStore.setState((prev) => ({
    _textureCache: new Map(prev._textureCache).set(texturePath, texture),
  }));
}

useTextureServiceStore.getState()._constructor();
