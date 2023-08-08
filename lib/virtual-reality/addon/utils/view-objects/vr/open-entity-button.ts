// @ts-ignore because three mesh ui's typescript support is not fully matured
import { IntersectableObject } from '../interfaces/intersectable-object';
import ThreeMeshUI from 'three-mesh-ui';
import { inject as service } from '@ember/service';
import { setOwner } from '@ember/application';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';


export type OpenEntityButtonArgs =ThreeMeshUI.BlockOptions & {
  owner:any;
  label: string;
  classId:string; 
  applicationId:string; 
}

export default class OpenEntityButton
  extends ThreeMeshUI.Block
  implements IntersectableObject
{

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  highlightingServic!: HighlightingService;

  isHovered = false;
  label: string;
  classId:string;
  applicationId: string;

  constructor({
    owner,
    label, 
    classId,
    applicationId, 
    ...options
  }:
    OpenEntityButtonArgs) {
    super(options);
    this.label =label;
    this.applicationId = applicationId;
    this.classId = classId;
    setOwner(this,owner);
    const labelBox = new ThreeMeshUI.Text({ content:label });
    this.add(labelBox);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  triggerDown() {
    const mesh = this.applicationRenderer.getBoxMeshByModelId(this.classId);
     const application = this.applicationRenderer.getApplicationById(
       this.applicationId
     );
     if (application) {
       this.applicationRenderer.openAllComponents(application);
       if(mesh){
        this.highlightingServic.highlight(mesh as ClazzMesh);
       }
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