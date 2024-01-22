import { EntityType } from 'extended-reality/utils/vr-message/util/entity_type';
import ThreeMeshUI from 'three-mesh-ui';
import { DetachableMenu } from '../../detachable-menu';
import InteractiveMenu from '../../interactive-menu';
import { BaseMenuArgs } from '../../base-menu';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import { SIZE_RESOLUTION_FACTOR } from '../../ui-menu';
import VRControllerButtonBinding from 'extended-reality/utils/vr-controller/vr-controller-button-binding';
import CollaborationSession from 'collaboration/services/collaboration-session';
import { setOwner } from '@ember/application';
import LocalUser from 'collaboration/services/local-user';
import {
  BLOCK_OPTIONS_CONTAINER,
  BLOCK_OPTIONS_TITLE,
} from '../detail-info-menu';

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

  name!: string;

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
    if (this.collaborationSession.lookupRemoteUserById(this.userId)) {
      this.name = this.collaborationSession.lookupRemoteUserById(
        this.userId
      )!.userName;
    } else {
      this.name = 'you';
    }
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
    ThreeMeshUI.update();

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

    const titleBlock = new ThreeMeshUI.Block({
      width: res.width * worldSizeFactor + 0.05,
      height: res.height * worldSizeFactor + 0.05 + BLOCK_OPTIONS_TITLE.height,
      fontFamily: BLOCK_OPTIONS_CONTAINER.fontFamily,
      fontTexture: BLOCK_OPTIONS_CONTAINER.fontTexture,
      justifyContent: 'start',
      textAlign: 'center',
      offset: 0.02,
      backgroundOpacity: 0,
    });

    const title = new ThreeMeshUI.Text({
      content: this.name,
      fontColor: new THREE.Color('#000000'),
    });

    titleBlock.add(title);
    this.add(titleBlock);
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
