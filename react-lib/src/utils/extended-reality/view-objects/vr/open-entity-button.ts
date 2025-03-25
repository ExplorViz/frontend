// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';
import { EntityMesh } from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

export type OpenEntityButtonArgs = ThreeMeshUI.BlockOptions & {
  label: string;
  classId: string;
  applicationId: string;
};

export default class OpenEntityButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{
  isHovered = false;
  label: string;
  classId: string;
  applicationId: string;

  constructor({
    label,
    classId,
    applicationId,
    ...options
  }: OpenEntityButtonArgs) {
    super(options);
    this.label = label;
    this.applicationId = applicationId;
    this.classId = classId;
    const labelBox = new ThreeMeshUI.Text({ content: label });
    this.add(labelBox);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    const mesh = useApplicationRendererStore
      .getState()
      .getBoxMeshByModelId(this.classId);
    const application = useApplicationRendererStore
      .getState()
      .getApplicationById(this.applicationId);
    if (application) {
      useApplicationRendererStore.getState().openAllComponents(application);
      if (mesh) {
        useHighlightingStore.getState().toggleHighlight(mesh as EntityMesh, {
          sendMessage: true,
          remoteColor: useLocalUserStore.getState().color,
        });
      }
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
    this.set({ backgroundOpacity: 0.2 });
  }
}
