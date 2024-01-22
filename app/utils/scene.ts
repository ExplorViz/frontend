import { VisualizationMode } from 'collaborative-mode/services/local-user';
import * as THREE from 'three';
import FloorMesh from 'extended-reality/utils/view-objects/vr/floor-mesh';

const FLOOR_SIZE = 1000;

const PI = Math.PI;

export function light(): THREE.AmbientLight {
  return new THREE.AmbientLight(
    new THREE.Color(0.65 * PI, 0.65 * PI, 0.65 * PI)
  );
}

export function directionalLight(): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xffffff, 0.55 * PI);
  light.name = 'DirectionalLight';
  light.position.set(-5, 5, 5);
  light.castShadow = true;
  return light;
}

export function spotlight(): THREE.SpotLight {
  const spotLight = new THREE.SpotLight(0xffffff, 0.5, 2000);
  spotLight.position.set(-200, 100, 100);
  spotLight.castShadow = true;
  spotLight.angle = 0.3;
  spotLight.penumbra = 0.2;
  spotLight.decay = 2;
  return spotLight;
}

export function skylight() {
  const skyLight = new THREE.SpotLight(0xffffff, 0.5, 1000, Math.PI, 0, 0);
  skyLight.castShadow = false;
  return skyLight;
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
  scene.add(light());
  //scene.add(spotlight());
  scene.add(directionalLight());
  return scene;
}

export function vrScene(): THREE.Scene {
  // Initialize sceene.
  const scene = new THREE.Scene();

  // Initilize floor.
  const floor = new FloorMesh(FLOOR_SIZE, FLOOR_SIZE);
  scene.add(floor);

  // Initialize lights.
  scene.add(light());
  // scene.add(spotlight());
  scene.add(directionalLight());

  // Add a light that illuminates the sky box if the user dragged in a backgound image.
  // scene.add(skylight());
  return scene;
}
