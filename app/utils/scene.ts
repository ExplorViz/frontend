import { VisualizationMode } from 'collaboration/services/local-user';
import * as THREE from 'three';
import FloorMesh from 'extended-reality/utils/view-objects/vr/floor-mesh';
import { getStoredSettings } from './settings/local-storage-settings';

const FLOOR_SIZE = 1000;

const PI = Math.PI;

export function ambientLight(): THREE.AmbientLight {
  return new THREE.AmbientLight(
    new THREE.Color(0.65 * PI, 0.65 * PI, 0.65 * PI)
  );
}

export function directionalLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xffffff, 0.55 * PI);
  light.name = 'DirectionalLight';
  light.position.set(-5, 5, 5);
  light.castShadow = getStoredSettings().castShadows.value;
  return light;
}

export function spotlight(): THREE.SpotLight {
  const light = new THREE.SpotLight(0xffffff, 0.5, 2000);
  light.position.set(-200, 100, 100);
  light.castShadow = getStoredSettings().castShadows.value;
  light.angle = 0.3;
  light.penumbra = 0.2;
  light.decay = 2;
  light.name = 'SpotLight';
  return light;
}

export function createScene(visualizationMode: VisualizationMode) {
  if (visualizationMode === 'vr') {
    return vrScene();
  } else {
    return defaultScene();
  }
}

export function defaultScene() {
  const scene = new THREE.Scene();
  const defLight = ambientLight();
  scene.add(defLight);
  defLight.layers.enableAll();
  //scene.add(spotlight());
  const directLight = directionalLight();
  directLight.layers.enableAll();
  scene.add(directLight);
  return scene;
}

export function vrScene(): THREE.Scene {
  // Initialize sceene.
  const scene = new THREE.Scene();

  // Initilize floor.
  const floor = new FloorMesh(FLOOR_SIZE, FLOOR_SIZE);
  scene.add(floor);

  // Initialize lights.
  scene.add(ambientLight());
  scene.add(directionalLight());

  return scene;
}
