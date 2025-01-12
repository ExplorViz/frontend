import { createStore } from 'zustand/vanilla';
import { Texture, TextureLoader } from 'three';

interface TextureServiceState {
    _textureCache: Map<string, Texture>;
    addTexture: (texturePath: string, texture: Texture) => void;
    loader: TextureLoader;
}


export const useTextureServiceStore = createStore<TextureServiceState>(() => ({
    _textureCache: new Map(),
    addTexture,
    loader: new TextureLoader(),
}));

function addTexture(texturePath: string, texture: Texture) {
    useTextureServiceStore.setState((prev) => ({
        _textureCache: new Map(prev._textureCache).set(texturePath, texture)
    }));
}