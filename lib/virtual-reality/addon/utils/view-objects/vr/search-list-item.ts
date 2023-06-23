import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';

export const BLOCK_OPTIONS_LIST_ITEM = {
    height: 0.08,
};

export type SearchListItemArgs = ThreeMeshUI.BlockOptions & {
    text: string,
    meshId: string
}

export default class SearchListItem
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  text: string;
  meshId: string;

  constructor({text, meshId, ...options} : SearchListItemArgs) {
    super({...options, hiddenOverflow: true,});
    this.text = text;
    this.meshId = meshId;

    const itemText = new ThreeMeshUI.Text({ content: text });
    this.add(itemText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    console.log(this.text + " pressed");
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    this.set({ backgroundOpacity: 0.4});
  }

  resetHover() {
    this.isHovered = false;
    this.set({ backgroundOpacity: 0});
  }
}
