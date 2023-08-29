import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export type SearchListTextArgs = ThreeMeshUI.TextOptions & {
  text: string;
  meshId: string;
};

export default class SearchListText extends ThreeMeshUI.Text {
  text: string;
  meshId: string;

  constructor({ text, meshId, ...options }: SearchListTextArgs) {
    super({ ...options, content: text + '\n' });
    this.text = text;
    this.meshId = meshId;
  }

  applyHover() {
    // @ts-ignore
    this.set({ fontColor: new THREE.Color('yellow') });
  }

  resetHover() {
    // @ts-ignore
    this.set({ fontColor: new THREE.Color('white') });
  }
}
