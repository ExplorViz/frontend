import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Class, Method } from './landscape-schemes/structure-data';
import { skylight } from './scene';
import * as THREE from 'three';
import { ImmersiveView } from 'explorviz-frontend/rendering/application/immersive-view';

export default class ImmsersiveClassScene {
  classModel: Class;
  scene: THREE.Scene;

  constructor(dataModel: Class, scene: THREE.Scene) {
    this.classModel = dataModel;
    this.scene = scene;
  }

  fillScene(camera: THREE.Camera) {
    // Add basic light
    this.scene.add(skylight());
    //scene.add(light());
    // White Background!
    this.scene.background = new THREE.Color(1, 1, 1);

    //https://dustinpfister.github.io/2021/05/14/threejs-examples-position-things-to-sphere-surface/
    // Use of Euler to position/rotate objects around a sphere.
    // https://dustinpfister.github.io/2022/02/04/threejs-vector3-set-from-spherical-coords/

    // Create invisible "sphere".

    const sphere1 = new THREE.Mesh(
      new THREE.SphereGeometry(1, 15, 15),
      new THREE.MeshNormalMaterial({ wireframe: true })
    );
    // camera.updateMatrixWorld();
    // const vector = camera.position.clone();
    // console.log('Lokal Camera: ');
    // console.log(vector);
    // //vector.applyMatrix4(camera.matrixWorld);
    // camera.localToWorld(vector);
    // console.log('World Camera: ');
    // console.log(vector);
    sphere1.position.copy(camera.position);
    //sphere1.rotation.copy(camera.rotation);
    //sphere1.position.add(vector);
    //console.log('Local Sphere: ');
    //console.log(sphere1.position);
    this.scene.add(sphere1);

    this.displayClassName(this.classModel.name, sphere1);
    this.displayMethods(this.classModel.methods, sphere1);
  }

  private displayClassName(name: string, sphere: THREE.Mesh) {
    // const loader = new FontLoader();
    // loader.load(
    //   'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
    //   (font) => {
    //   }
    // );
    const geometry = new TextGeometry(name, {
      font: ImmersiveView.instance.font,
      size: 0.5,
      height: 0.2,
      depth: 0.1,
      curveSegments: 12,
    });
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: false,
    });
    //debugger;
    const textMesh1 = new THREE.Mesh(geometry, material);

    textMesh1.geometry.computeBoundingBox();

    const angleDegrees = this.calculateAngleOfObject(
      textMesh1.geometry.boundingBox.min,
      textMesh1.geometry.boundingBox?.max,
      sphere.position
    );

    this.positionInSphereRadius2(
      textMesh1,
      70,
      180 + angleDegrees / 2, // Move the Text to the Center of the Camera View
      sphere,
      3
    );
    //textMesh1.rotateY(-Math.PI);
    this.scene.add(textMesh1);

    // Veraltet

    // const geometry = new TextGeometry(name, {
    //   font: ImmersiveView.instance.font,
    //   size: 4,
    //   depth: 2,
    //   curveSegments: 12,
    //   bevelEnabled: true,
    //   bevelThickness: 2,
    //   bevelSize: 1,
    //   bevelOffset: 0,
    //   bevelSegments: 5,
    // });
    // const cameraOrient = new THREE.Vector3();
    // camera.getWorldDirection(cameraOrient);
    // const newPosition = new THREE.Vector3();
    // newPosition.copy(camera.position).add(cameraOrient.multiplyScalar(10));
    // textMesh1.position.copy(newPosition);
    // //textMesh1.quaternion.copy(camera.quaternion);
    // // geometry.computeBoundingBox();
    // // textMesh1.position.x =
    // //   camera.position.x -
    // //   5.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    // //this.positionInSphereRadius(camera.position, 2, 0, 0, 0, textMesh1);
    // textMesh1.rotateY(-Math.PI);
    // //textMesh1.position.z = camera.position.z + 2;
    // //textMesh1.rotation.y = Math.PI / 2;
  }

  private calculateAngleOfObject(
    min: THREE.Vector3,
    max: THREE.Vector3,
    startpoint: THREE.Vector3
  ) {
    const minPoint = min;
    const maxPoint = max;

    // Calculate the vectors from the Sphere to these points
    const leftVector = new THREE.Vector3()
      .subVectors(minPoint, startpoint)
      .normalize();
    const rightVector = new THREE.Vector3()
      .subVectors(maxPoint, startpoint)
      .normalize();

    // Compute the angle between the two vectors
    const dotProduct = leftVector.dot(rightVector);
    const angle = Math.acos(dotProduct); // Angle in radians

    // Optionally convert to degrees
    const angleDegrees = THREE.MathUtils.radToDeg(angle);
    return angleDegrees;
  }

  private displayMethods(methods: Method[], sphere: THREE.Mesh) {
    methods.forEach((method, idx) => {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshBasicMaterial({ color: 0x00a0ff });
      const cube = new THREE.Mesh(geometry, material);
      const geometryText = new TextGeometry(method.name, {
        font: ImmersiveView.instance.font,
        size: 0.02,
        height: 0.01,
        //depth: 0.1,
        curveSegments: 5,
      });
      const materialText = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: false,
      });
      //debugger;
      const textMesh1 = new THREE.Mesh(geometryText, materialText);
      textMesh1.geometry.computeBoundingBox();

      const angleDegrees = this.calculateAngleOfObject(
        textMesh1.geometry.boundingBox.min,
        textMesh1.geometry.boundingBox?.max,
        sphere.position
      );
      this.positionInSphereRadius2(cube, 90, 180 + 25 * idx, sphere, 1.5);
      this.positionInSphereRadius2(
        textMesh1,
        90,
        180 + 25 * idx + angleDegrees,
        sphere,
        0
      );
      this.scene.add(cube);
      this.scene.add(textMesh1);
    });
  }

  private positionInSphereRadius(
    centerOfShpere: THREE.Vector3,
    radiusOfSphere: number,
    lat: number,
    long: number,
    alt: number,
    mesh: THREE.Mesh
  ) {
    // const v1 = new THREE.Vector3(0, radiusOfSphere + alt, 0);
    // const x = Math.PI * lat;
    // const z = Math.PI * 2 * long;
    // const e1 = new THREE.Euler(x, 0, z);
    // mesh.position.copy(centerOfShpere).add(v1).applyEuler(e1);

    // const radian = Math.PI * -0.5 + Math.PI * lat;
    // const x = Math.cos(radian) * radiusOfSphere;
    // const y = Math.sin(radian) * radiusOfSphere;
    // mesh.position.set(x, y, 0);
    // // set long
    // mesh.rotation.y = Math.PI * 2 * long;

    // https://discourse.threejs.org/t/orientation-of-objects-on-a-sphere-surface/28220/3
    //set on sphere
    const randPhi = Math.random() * Math.PI * 1 - Math.PI / 2; //horiz, subtract Math.PI/2 so only in top half of sphere
    const randTheta = Math.random() * Math.PI * 1 - Math.PI / 2; //vert, subtract Math.PI/2 so only in top half of sphere
    mesh.position.setFromSphericalCoords(radiusOfSphere, randPhi, randTheta);
    mesh.position.add(centerOfShpere);
    mesh.position.y += alt; //move down to align with sphere offset

    //align on sphere
    const vectorToPointOnSphere = new THREE.Vector3();
    const sphericalCoord = new THREE.Spherical(
      radiusOfSphere,
      randPhi,
      randTheta
    );
    vectorToPointOnSphere.setFromSpherical(sphericalCoord);
    const originalOrientation = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(
      originalOrientation,
      vectorToPointOnSphere.normalize()
    );
  }

  positionInSphereRadius2(
    mesh: THREE.Mesh,
    p: number,
    t: number,
    sphere: THREE.Mesh,
    offset: number
  ) {
    // get geometry of the sphere mesh
    const sGeo = sphere.geometry;
    // computer bounding sphere for geometry of the sphere mesh
    sGeo.computeBoundingSphere();
    // use radius value of Sphere instance at
    // boundingSphere of the geometry of sphereMesh
    const radius =
        sGeo.boundingSphere === null ? 3 : sGeo.boundingSphere.radius + offset,
      phi = THREE.MathUtils.degToRad(p === undefined ? 0 : p),
      theta = THREE.MathUtils.degToRad(t === undefined ? 0 : t);
    //console.log(radius);
    mesh.position
      .setFromSphericalCoords(radius, phi, theta)
      .add(sphere.position);
    mesh.lookAt(sphere.position);
  }
}
