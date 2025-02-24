import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import { EntityMesh } from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

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
  isHovered = false;
  text: string;
  meshId: string;
  applicationId: string;

  constructor({
    owner,
    text,
    meshId,
    applicationId,
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
    const mesh = useApplicationRendererStore
      .getState()
      .getBoxMeshByModelId(this.meshId);
    const application = useApplicationRendererStore
      .getState()
      .getApplicationById(this.applicationId);
    if (application) {
      useApplicationRendererStore.getState().openAllComponents(application);
      if (mesh)
        useHighlightingStore.getState().toggleHighlight(mesh as EntityMesh, {
          sendMessage: true,
          remoteColor: useLocalUserStore.getState().color,
        });
    }
  }

  applyHover() {
    if (this.isHovered) return;

    this.isHovered = true;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0.4 });
  }

  resetHover() {
    this.isHovered = false;
    // @ts-ignore no types atm
    this.set({ backgroundOpacity: 0 });
  }
}
