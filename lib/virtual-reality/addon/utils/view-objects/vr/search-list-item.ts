import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from '../interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

export const BLOCK_OPTIONS_LIST_ITEM = {
  height: 0.08,
};

export type SearchListItemArgs = ThreeMeshUI.BlockOptions & {
  owner: any;
  text: string;
  meshId: string;
  applicationId: string;
};

export default class SearchListItem
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  isHovered = false;
  text: string;
  meshId: string;
  applicationId: string;

  constructor({
    owner,
    text,
    meshId,
    applicationId,
    applicationRenderer,
    ...options
  }: SearchListItemArgs) {
    super({ ...options, hiddenOverflow: true });
    this.text = text;
    this.meshId = meshId;
    this.applicationId = applicationId;
    setOwner(this, owner);
    const itemText = new ThreeMeshUI.Text({ content: text });
    this.add(itemText);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    const mesh = this.applicationRenderer.getBoxMeshByModelId(this.meshId);
    const application = this.applicationRenderer.getApplicationById(
      this.applicationId
    );
    if (application) {
      this.applicationRenderer.openAllComponents(application);
      mesh?.highlight();
    }
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    this.set({ backgroundOpacity: 0 });
  }
}
