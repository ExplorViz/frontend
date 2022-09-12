/**
 * Adapted from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/webxr/XRControllerModelFactory.js
 */

import {
  Constants as MotionControllerConstants, fetchProfile, MotionController, VisualResponse,
} from '@webxr-input-profiles/motion-controllers';
import debugLogger from 'ember-debug-logger';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import VrControllerModel from './vr-controller-model';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
const DEFAULT_PROFILE = 'generic-trigger';

export default class VrControllerModelFactory {
  static INSTANCE = new VrControllerModelFactory();

  debug = debugLogger('VrControllerModelFactory');

  gltfLoader: GLTFLoader;

  path: string;

  assetSceneCache: { [key: string]: Promise<THREE.Group> };

  constructor(gltfLoader = null) {
    this.gltfLoader = gltfLoader || new GLTFLoader();
    this.path = DEFAULT_PROFILES_PATH;
    this.assetSceneCache = {};
  }

  /**
   * Walks the model's tree to find the nodes needed to animate the components and
   * saves them to the motionContoller components for use in the frame loop. When
   * touchpads are found, attaches a touch dot to them.
   */
  static findNodes(controllerModel: VrControllerModel, scene: THREE.Group) {
    if (!controllerModel.motionController) return;

    const debug = debugLogger('VrControllerModelFactory.findNodes()');

    // Loop through the components and find the nodes needed for each components' visual responses.
    Object.values(controllerModel.motionController.components).forEach(
      (component) => {
        const { type, touchPointNodeName, visualResponses } = component;

        if (type === MotionControllerConstants.ComponentType.TOUCHPAD) {
          const touchPointNode = scene.getObjectByName(touchPointNodeName);
          if (touchPointNode) {
            // Attach a touch dot to the touchpad.
            const sphereGeometry = new THREE.SphereBufferGeometry(0.001);
            const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            const sphere = new THREE.Mesh(sphereGeometry, material);
            touchPointNode.add(sphere);
            controllerModel.addTouchPointNode({ component, touchPointNode });
          } else {
            debug(
              `Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${component.id}`,
            );
          }
        }

        // Loop through all the visual responses to be applied to this component
        Object.values(visualResponses).forEach(
          (visualResponse: VisualResponse) => {
            const {
              valueNodeName,
              minNodeName,
              maxNodeName,
              valueNodeProperty,
            } = visualResponse;

            // If the target node cannot be found, skip this animation
            const valueNode = scene.getObjectByName(valueNodeName);
            if (!valueNode) {
              debug(`Could not find ${valueNodeName} in the model`);
              return;
            }

            // If animating a transform, find the two nodes to be interpolated between.
            if (
              minNodeName
              && maxNodeName
              && valueNodeProperty
                === MotionControllerConstants.VisualResponseProperty.TRANSFORM
            ) {
              const minNode = scene.getObjectByName(minNodeName);
              const maxNode = scene.getObjectByName(maxNodeName);

              // If the extents cannot be found, skip this animation
              if (!minNode) {
                debug(`Could not find ${minNodeName} in the model`);
                return;
              }

              if (!maxNode) {
                debug(`Could not find ${maxNodeName} in the model`);
                return;
              }

              controllerModel.addVisualResponseNodes({
                visualResponse,
                valueNode,
                minNode,
                maxNode,
              });
            } else {
              controllerModel.addVisualResponseNodes({
                visualResponse,
                valueNode,
              });
            }
          },
        );
      },
    );
  }

  static addAssetSceneToControllerModel(
    controllerModel: VrControllerModel,
    scene: THREE.Group | null,
  ) {
    if (!controllerModel.motionController || !scene) return;

    // Find the nodes needed for animation and cache them on the motionController.
    VrControllerModelFactory.findNodes(controllerModel, scene);

    // Apply any environment map that the mesh already has set.
    if (controllerModel.envMap) {
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.material.envMap = controllerModel.envMap;
          child.material.needsUpdate = true;
        }
      });
    }

    // Add the glTF scene to the controllerModel.
    controllerModel.add(scene);
  }

  createControllerModel(controller: THREE.Group) {
    const controllerModel = new VrControllerModel();
    let lastAssetScene: THREE.Group | null = null;

    controller.addEventListener('connected', async (event) => {
      try {
        const xrInputSource = event.data;
        if (
          xrInputSource.targetRayMode !== 'tracked-pointer'
          || !xrInputSource.gamepad
        ) return;

        // In version 1.0.0 of the motion-controllers library the return type of `fetchProfile` is
        // not annotated correctly. The bug has already been fixed (see
        // https://github.com/immersive-web/webxr-input-profiles/blob/main/packages/motion-controllers/src/profiles.d.ts)
        // but no new version has been released.
        //
        // TODO update dependency once a new version is released and remove the type assertions
        // below.
        const { profile, assetPath } = await ((fetchProfile(
          xrInputSource,
          this.path,
          DEFAULT_PROFILE,
        ) as unknown) as Promise<{ profile: object; assetPath?: string }>);
        if (!assetPath) return;

        controllerModel.onMotionControllerConnect(
          new MotionController(xrInputSource, profile, assetPath),
        );

        // Load the controller model.
        const assetScene = await this.loadAssetScene(assetPath);
        VrControllerModelFactory.addAssetSceneToControllerModel(
          controllerModel,
          assetScene,
        );
        lastAssetScene = assetScene;
      } catch (err) {
        this.debug(err);
      }
    });

    controller.addEventListener('disconnected', () => {
      controllerModel.onMotionControllerDisconnect();
      if (lastAssetScene) controllerModel.remove(lastAssetScene);
      lastAssetScene = null;
    });

    return controllerModel;
  }

  async loadAssetScene(assetUrl: string): Promise<THREE.Group> {
    if (!this.assetSceneCache[assetUrl]) {
      this.assetSceneCache[assetUrl] = new Promise((resolve, reject) => {
        this.gltfLoader.setPath('');
        this.gltfLoader.load(
          assetUrl,
          (asset: GLTF) => {
            resolve(asset.scene);
          },
          undefined,
          () => reject(new Error(`Failed to load asset from ${assetUrl}`)),
        );
      });
    }
    const cachedAsset = await this.assetSceneCache[assetUrl];
    return cachedAsset.clone();
  }
}
