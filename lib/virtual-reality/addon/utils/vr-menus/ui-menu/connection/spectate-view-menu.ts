import { EntityType } from 'virtual-reality/utils/vr-message/util/entity_type';
import { DetachableMenu } from '../../detachable-menu';
import InteractiveMenu from '../../interactive-menu';
import { BaseMenuArgs } from '../../base-menu';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import { SIZE_RESOLUTION_FACTOR } from '../../ui-menu';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { setOwner } from '@ember/application';
import LocalUser from 'collaborative-mode/services/local-user';

export type SpectateViewMenuArgs = BaseMenuArgs & {
  owner: any;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  userId: string;
};

export default class SpectateViewMenu
  extends InteractiveMenu
  implements DetachableMenu
{
  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;

  target!: THREE.WebGLRenderTarget;

  renderer!: THREE.WebGLRenderer;

  scene!: THREE.Scene;

  userId!: string;

  headsetCamera!: THREE.Camera;

  private firstTime: boolean = true;

  constructor({
    owner,
    renderer,
    scene,
    userId,
    ...args
  }: SpectateViewMenuArgs) {
    super(args);
    setOwner(this, owner);
    this.renderer = renderer;
    this.scene = scene;
    this.userId = userId;
    this.headsetCamera = new THREE.PerspectiveCamera();
  }

  private isVisualizationModeVr(): boolean {
    if (this.localUser.userId === this.userId) {
      return this.localUser.visualizationMode === 'vr';
    }
    return (
      this.collaborationSession
        .lookupRemoteUserById(this.userId)
        ?.getVisualizationMode() === 'vr'
    );
  }

  private updatePositions() {
    const cameraModel = this.collaborationSession.lookupRemoteUserById(
      this.userId
    )?.camera?.model;
    if (this.localUser.userId === this.userId) {
      this.headsetCamera = (
        this.localUser.camera as THREE.WebXRArrayCamera
      ).cameras[0];
    } else {
      if (!cameraModel) return;
      const cameraPosition = cameraModel.position;
      const cameraQuaternion = cameraModel.quaternion;

      this.headsetCamera.position.copy(cameraPosition);
      this.headsetCamera.quaternion.copy(cameraQuaternion);
    }
  }

  private printError() {
    //TODO: clear content and replace with error text
  }

  getDetachId(): string {
    return this.id.toString();
  }

  getEntityType(): EntityType {
    return 'spectate-view-menu';
  }

  onOpenMenu() {
    super.onOpenMenu();
    if (this.firstTime) {
      this.createPlane();
    }
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    if (this.isVisualizationModeVr()) {
      this.updatePositions();
      this.renderView();
    }
  }

  onCloseMenu(): void {
    super.onCloseMenu();
    this.firstTime = true;
  }

  private createPlane() {
    const res = new THREE.Vector2();
    this.renderer.getSize(res);

    this.target = new THREE.WebGLRenderTarget(res.width, res.height);

    const worldSizeFactor = SIZE_RESOLUTION_FACTOR;
    const geometry = new THREE.PlaneGeometry(
      res.width * worldSizeFactor,
      res.height * worldSizeFactor
    );
    const material = new THREE.MeshBasicMaterial({ map: this.target.texture });
    const plane = new THREE.Mesh(geometry, material);

    const backgroundPlaneGeometry = new THREE.PlaneGeometry(
      res.width * worldSizeFactor + 0.05,
      res.height * worldSizeFactor + 0.05
    );
    const backgroundPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 'black',
    });
    const backgroundPlane = new THREE.Mesh(
      backgroundPlaneGeometry,
      backgroundPlaneMaterial
    );
    plane.position.z = 0.005;
    plane.add(backgroundPlane);
    backgroundPlane.position.z -= 0.005;

    this.add(plane);

    this.firstTime = false;
  }

  private renderView() {
    const oldTarget = this.renderer.getRenderTarget();
    const oldXREnabled = this.renderer.xr.enabled;
    this.renderer.setRenderTarget(this.target);
    this.renderer.xr.enabled = false;

    const headsetMatrix = this.headsetCamera.matrixWorld.clone();
    const headsetPosition = new THREE.Vector3();
    headsetPosition.setFromMatrixPosition(headsetMatrix);

    this.renderer.render(this.scene, this.headsetCamera);
    this.headsetCamera.matrixWorld.copy(headsetMatrix);

    this.renderer.setRenderTarget(oldTarget);
    this.renderer.xr.enabled = oldXREnabled;
  }

  makeTriggerButtonBinding() {
    return new VRControllerButtonBinding('Detach', {
      onButtonDown: () => {
        this.detachMenu();
      },
    });
  }
}
