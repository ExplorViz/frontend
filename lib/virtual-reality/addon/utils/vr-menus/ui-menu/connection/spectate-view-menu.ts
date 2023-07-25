import { EntityType } from "virtual-reality/utils/vr-message/util/entity_type";
import { DetachableMenu } from "../../detachable-menu";
import InteractiveMenu from "../../interactive-menu";
import { BaseMenuArgs } from "../../base-menu";
import * as THREE from "three";
import { SIZE_RESOLUTION_FACTOR } from "../../ui-menu";
import VRControllerButtonBinding from "virtual-reality/utils/vr-controller/vr-controller-button-binding";

export type SpectateViewMenuArgs = BaseMenuArgs & {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    headsetCamera: THREE.Camera;
  };

export default class SpectateViewMenu
  extends InteractiveMenu
  implements DetachableMenu
{

    target!: THREE.WebGLRenderTarget;

    renderer!: THREE.WebGLRenderer;

    scene!: THREE.Scene;

    headsetCamera!: THREE.Camera;


    constructor( {renderer, scene, headsetCamera, ...args} : SpectateViewMenuArgs){
        super(args);
        this.renderer = renderer;
        this.scene = scene;
        this.headsetCamera = headsetCamera;


        const res = new THREE.Vector2();
        this.renderer.getSize(res);
        
        this.target = new THREE.WebGLRenderTarget(
            res.width,
            res.height
            );

        const worldSizeFactor = SIZE_RESOLUTION_FACTOR;
        const geometry = new THREE.PlaneGeometry(res.width * worldSizeFactor, res.height * worldSizeFactor);
        const material = new THREE.MeshBasicMaterial({ map: this.target.texture });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.z = 0.001;
        this.add(plane);

    }


    getDetachId(): string {
        return 'spectate-view-menu';
      }
    
      getEntityType(): EntityType {
        return 'spectate-view-menu';
      }


      onOpenMenu() {
        super.onOpenMenu();
      }

      onUpdateMenu(delta: number) {
        super.onUpdateMenu(delta);
        this.renderView();
      }

      onCloseMenu(): void {
        super.onCloseMenu();
      }


      private renderView(){
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