import THREE from "three";

export function light(): THREE.AmbientLight {
  return new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
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
