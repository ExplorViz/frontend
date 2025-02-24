import ThreeMeshUI from 'three-mesh-ui';
import { IntersectableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import * as THREE from 'three';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { EntityMesh } from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';

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

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

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
    const mesh = this.applicationRenderer.getBoxMeshByModelId(this.meshId);
    const application = this.applicationRenderer.getApplicationById(
      this.applicationId
    );
    if (application) {
      this.applicationRenderer.openAllComponents(application);
      if (mesh)
        this.highlightingService.toggleHighlight(mesh as EntityMesh, {
          sendMessage: true,
          remoteColor: this.localUser.color,
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
