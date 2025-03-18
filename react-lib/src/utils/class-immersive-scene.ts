import { TextGeometry } from 'three-stdlib'; //'three/examples/jsm/geometries/TextGeometry';
import {
  Class,
  Interface,
  Method,
  Parameters,
  Variable,
} from './landscape-schemes/structure-data';
import * as THREE from 'three';
// import { ImmersiveView } from 'explorviz-frontend/rendering/application/immersive-view';
import { ImmersiveView } from 'react-lib/src/rendering/application/immersive-view';

class ObjectSizeList {
  /**
   * Stores an 3D object and its angle (from left corner to right corner) based on a center point
   */
  object3d: THREE.Object3D;
  angleSize: number;
  constructor(object3d: THREE.Object3D, anglesize: number) {
    this.object3d = object3d;
    this.angleSize = anglesize;
  }
}

export default class ImmsersiveClassScene {
  classModel: Class;
  scene: THREE.Scene;

  constructor(dataModel: Class, scene: THREE.Scene) {
    this.classModel = dataModel;
    this.scene = scene;

    // Inject Test Data
    const newInterface: Partial<Interface> = {
      name: 'MyInterface',
      methods: [],
    };
    this.classModel.implements = [newInterface as Interface];
    const newExtended: Partial<Class> = {
      name: 'ParentClass',
      methods: [],
    };
    this.classModel.extends = [newExtended as Class];
    const newVar: Partial<Variable> = {
      name: 'myVar1',
      private: false,
      type: 'int',
    };
    const newVarP: Partial<Variable> = {
      name: 'myPrivateVar',
      private: false,
      type: 'str',
    };
    this.classModel.variables = [newVar as Variable, newVarP as Variable];
    const newMParam: Partial<Parameters> = {
      name: 'para1',
      type: 'str',
    };
    this.classModel.methods.forEach((m) => {
      m.parameters = [newMParam as Parameters, newMParam as Parameters];
    });
    // END of Inject Test Data
  }

  fillScene(camera: THREE.Camera) {
    // Add basic light
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

    // For debug reasons
    //this.scene.add(sphere1);

    this.displayClassHeaderInformation(this.classModel, sphere1);
    this.displaySeperator(55, 0.005, sphere1);
    this.displayMethods(this.classModel.methods, sphere1);
    this.displaySeperator(125, 0.005, sphere1);
    if (this.classModel.variables)
      this.displayVariables(this.classModel.variables, sphere1);
  }

  /**
   * Displays variables around the sphere
   * @param vars List of all Variables
   * @param sphere The Sphere provides the radius and the position
   */
  private displayVariables(
    vars: Variable[],
    sphere: THREE.Mesh<
      THREE.SphereGeometry,
      THREE.MeshNormalMaterial,
      THREE.Object3DEventMap
    >
  ) {
    const variableMeshList = new Array<ObjectSizeList>();
    vars.forEach((variable) => {
      const group = new THREE.Group();
      // Material for the boxes
      // const boxMaterial = new THREE.MeshBasicMaterial({
      //   color: 0x000005,
      //   wireframe: false,
      // });
      const boxMaterial = new THREE.LineDashedMaterial({
        color: 0xffaa00,
        dashSize: 3,
        gapSize: 1,
      });

      // Store the TextLabel on the surface of the previously created box mesh
      const nameTextGeometry = new TextGeometry(variable.name, {
        font: ImmersiveView.instance.font!,
        size: 0.2,
        height: 0.1,
        depth: 0.01,
        curveSegments: 12,
      });
      const nameTextMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: false,
      });
      const nameText = new THREE.Mesh(nameTextGeometry, nameTextMaterial);
      nameText.geometry.computeBoundingBox();
      // Alling Text in Center
      nameText.position.set(
        -(
          nameText.geometry.boundingBox?.max.x -
          nameText.geometry.boundingBox?.min.x
        ) / 2,
        0.2,
        0.3
      ); // Position the text within the box

      // Create the box for the class variable name
      //const nameBoxGeometry = new THREE.BoxGeometry(2, 1, 0.5);
      const whd = new THREE.Vector3();
      nameText.geometry.boundingBox?.getSize(whd);
      const geometryBox = this.box(whd.x, 1, 0.5);
      const nameBox = new THREE.LineSegments(geometryBox, boxMaterial);
      group.add(nameBox);
      nameBox.add(nameText);

      // Create the box for the return type
      const returnTypeBoxGeometry = new THREE.BoxGeometry(1, 0.5, 0.2);
      const returnTypeBox = new THREE.Mesh(returnTypeBoxGeometry, boxMaterial);
      //returnTypeBox.geometry.computeBoundingBox();
      returnTypeBox.position.set(returnTypeBox.position.x, -0.1, 0); // Position below the named box
      group.add(returnTypeBox);

      // Write return Type Label on the Box
      const returnTypeTextGeometry = new TextGeometry(variable.type, {
        font: ImmersiveView.instance.font!,
        size: 0.15,
        height: 0.1,
        depth: 0.01,
        curveSegments: 12,
      });
      const returnTypeTextMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: false,
      });
      const returnTypeText = new THREE.Mesh(
        returnTypeTextGeometry,
        returnTypeTextMaterial
      );
      returnTypeText.geometry.computeBoundingBox();
      returnTypeText.position.set(
        -(
          returnTypeText.geometry.boundingBox?.max.x -
          returnTypeText.geometry.boundingBox?.min.x
        ) / 2,
        0,
        0.15
      );
      returnTypeBox.add(returnTypeText);

      //this.scene.add(group);
      this.positionInSphereRadius2(group, 90, 180, sphere, 3.5);
      // Calculate Box Size
      const aabb = new THREE.Box3();
      aabb.setFromObject(group);
      const requiredSpace = this.calculateAngleOfObject(
        aabb.min,
        aabb.max,
        sphere.position,
        10 //provides an offset such that the object are not touching each other
      );
      variableMeshList.push(new ObjectSizeList(group, requiredSpace));
    });

    let looper: number = 0;
    let currentAngleLevel = 361;

    do {
      currentAngleLevel = variableMeshList.reduce((pre, cur) => {
        return pre + cur.angleSize;
      }, 0);
      if (currentAngleLevel > 360) {
        variableMeshList.forEach((ele) => {
          this.positionInSphereRadius2(
            ele.object3d,
            90,
            180,
            sphere,
            3.5 + looper
          );
          // Calculate Box Size
          const aabb = new THREE.Box3();
          aabb.setFromObject(ele.object3d);
          const requiredSpace = this.calculateAngleOfObject(
            aabb.min,
            aabb.max,
            sphere.position,
            10 //provides an offset such that the object are not touching each other
          );
          ele.angleSize = requiredSpace;
        });
      } else {
        variableMeshList.reduce((prev, ele) => {
          this.positionInSphereRadius2(
            ele.object3d,
            90,
            180 + prev + ele.angleSize / 2,
            sphere,
            3.5 + looper
          );
          this.scene.add(ele.object3d);
          return ele.angleSize + prev;
        }, 0);
      }
      looper++;
    } while (currentAngleLevel > 360 && looper < 5);
  }

  /**
   * Displays seperator ring
   * @param angle The height at witch a seperator line is added in the horizontal
   * @param size Thickness of the line
   * @param sphere The Sphere that provides position and radius
   */
  private displaySeperator(angle: number, size: number, sphere: THREE.Mesh) {
    sphere.geometry.computeBoundingSphere();
    const posOnSphere = new THREE.Vector3();
    posOnSphere.setFromSphericalCoords(
      sphere.geometry.boundingSphere.radius,
      THREE.MathUtils.degToRad(angle),
      0
    );
    // Calculate the radius of the circle at distance y from the centerpoint
    const sliceRadius = Math.sqrt(
      sphere.geometry.boundingSphere.radius *
        sphere.geometry.boundingSphere.radius -
        posOnSphere.y * posOnSphere.y
    );
    // const rad = angle,
    //   delta = 0.05,
    //   segs = 64;

    const geometry = new THREE.TorusGeometry(sliceRadius, size, 64, 48);
    const material = new THREE.MeshBasicMaterial({ color: 0x000 });
    const torus = new THREE.Mesh(geometry, material);
    torus.rotation.x = Math.PI / 2;
    torus.geometry.center();
    torus.position
      .copy(sphere.position)
      .add(
        new THREE.Vector3(
          0,
          angle <= 90
            ? sphere.geometry.boundingSphere.radius - sliceRadius
            : -sphere.geometry.boundingSphere.radius + sliceRadius,
          0
        )
      );
    this.scene.add(torus);
  }

  private displayClassHeaderInformation(theClass: Class, sphere: THREE.Mesh) {
    // const loader = new FontLoader();
    // loader.load(
    //   'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
    //   (font) => {
    //   }
    // );
    // Classenname
    //
    //
    const classNameGeometry = new TextGeometry(theClass.name, {
      font: ImmersiveView.instance.font,
      size: 0.5,
      height: 0.2,
      depth: 0.1,
      curveSegments: 12,
    });
    const classNameMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: false,
    });
    const classNameMesh = new THREE.Mesh(classNameGeometry, classNameMaterial);

    classNameMesh.geometry.center();
    benderhelper(classNameGeometry, 'y', 0.15);
    classNameMesh.geometry.computeBoundingBox();
    this.positionInSphereRadius2(
      classNameMesh,
      70,
      180, // Move the Text to the Center of the Camera View
      sphere,
      3
    );
    // const angleDegrees = this.calculateAngleOfObject(
    //   classNameMesh.geometry.boundingBox.min,
    //   classNameMesh.geometry.boundingBox?.max,
    //   sphere.position
    // );
    this.positionInSphereRadius2(
      classNameMesh,
      70,
      180, // Move the Text to the Center of the Camera View
      sphere,
      3
    );
    //textMesh1.rotateY(-Math.PI);
    this.scene.add(classNameMesh);

    // Implements
    //
    //
    const implementsGeometry = new TextGeometry('Implements', {
      font: ImmersiveView.instance.font!,
      size: 0.2,
      height: 0.1,
      depth: 0.01,
      curveSegments: 12,
    });
    const implementsMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: false,
    });
    const implementsMesh = new THREE.Mesh(
      implementsGeometry,
      implementsMaterial
    );
    implementsMesh.geometry.center();
    this.positionInSphereRadius2(
      implementsMesh,
      65,
      180 + 60, // Move the Text to the Center of the Camera View
      sphere,
      3
    );
    this.scene.add(implementsMesh);
    // Bulletpoint List
    this.classModel.implements?.forEach((element, idx) => {
      const implementsGeometry = new TextGeometry('•' + element.name, {
        font: ImmersiveView.instance.font,
        size: 0.2,
        height: 0.1,
        depth: 0.01,
        curveSegments: 12,
      });
      const implementsMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: false,
      });
      const implementsMesh = new THREE.Mesh(
        implementsGeometry,
        implementsMaterial
      );
      implementsMesh.geometry.center();
      this.positionInSphereRadius2(
        implementsMesh,
        70 + idx * 5,
        180 + 60, // Move the Text to the Center of the Camera View
        sphere,
        3
      );
      this.scene.add(implementsMesh);
    });
    // Extends
    //
    //
    const extendsGeometry = new TextGeometry('Extends', {
      font: ImmersiveView.instance.font,
      size: 0.2,
      height: 0.1,
      depth: 0.01,
      curveSegments: 12,
    });
    const extendsMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      wireframe: false,
    });
    const extendsMesh = new THREE.Mesh(extendsGeometry, extendsMaterial);
    this.positionInSphereRadius2(
      extendsMesh,
      65,
      180 - 60, // Move the Text to the Center of the Camera View
      sphere,
      3
    );
    extendsMesh.geometry.center();
    this.scene.add(extendsMesh);
    // Bulletpoint List
    this.classModel.extends?.forEach((element, idx) => {
      const extendsGeometry = new TextGeometry('•' + element.name, {
        font: ImmersiveView.instance.font,
        size: 0.2,
        height: 0.1,
        depth: 0.01,
        curveSegments: 12,
      });
      const extendsMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: false,
      });
      const extendsMesh = new THREE.Mesh(extendsGeometry, extendsMaterial);
      extendsMesh.geometry.center();
      this.positionInSphereRadius2(
        extendsMesh,
        70 + idx * 5,
        180 - 60, // Move the Text to the Center of the Camera View
        sphere,
        3
      );
      this.scene.add(extendsMesh);
    });
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

  private displayMethods(methods: Method[], sphere: THREE.Mesh) {
    const methodenMeshList = new Array<ObjectSizeList>();
    methods.forEach((method) => {
      const ourGroup = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({ color: 0x00a0ff });
      const material2 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const geometryText = new TextGeometry(method.name, {
        font: ImmersiveView.instance.font,
        size: 0.1,
        height: 0.07,
        depth: 0.01,
        curveSegments: 5,
      });
      const materialText = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: false,
      });
      const textMesh1 = new THREE.Mesh(geometryText, materialText);
      textMesh1.geometry.computeBoundingBox();
      const whd = new THREE.Vector3();
      textMesh1.geometry.boundingBox?.getSize(whd);
      const geometry = new THREE.BoxGeometry(whd.x, 0.5, 0.2);
      const cube = new THREE.Mesh(geometry, material);
      // const angleDegrees = this.calculateAngleOfObject(
      //   textMesh1.geometry.boundingBox.min,
      //   textMesh1.geometry.boundingBox?.max,
      //   sphere.position
      // );
      // this.positionInSphereRadius2(
      //   textMesh1,
      //   115,
      //   180 + 25 * idx + angleDegrees,
      //   sphere,
      //   0
      // );
      ourGroup.add(cube);
      ourGroup.add(textMesh1);
      textMesh1.geometry.center();
      textMesh1.position.setZ(0.1);
      //textMesh1.position.setY(0.1);

      //
      //  Return Type
      //
      const returnTypeBoxGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.2);
      const returnTypeBox = new THREE.Mesh(returnTypeBoxGeometry, material2);
      //returnTypeBox.geometry.computeBoundingBox();
      returnTypeBox.position.set(returnTypeBox.position.x, -0.1, 0); // Position below the named box
      ourGroup.add(returnTypeBox);

      // Write return Type Label on the Box
      const returnTypeTextGeometry = new TextGeometry(
        method.type != undefined ? method.type : 'any',
        {
          font: ImmersiveView.instance.font,
          size: 0.07,
          height: 0.04,
          depth: 0.01,
          curveSegments: 12,
        }
      );
      const returnTypeTextMaterial = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: false,
      });
      const returnTypeText = new THREE.Mesh(
        returnTypeTextGeometry,
        returnTypeTextMaterial
      );
      returnTypeText.geometry.center();
      returnTypeBox.geometry.center();
      // returnTypeText.geometry.computeBoundingBox();
      // returnTypeText.position.set(
      //   -(
      //     returnTypeText.geometry.boundingBox?.max.x -
      //     returnTypeText.geometry.boundingBox?.min.x
      //   ) / 2,
      //   0,
      //   0.15
      // );
      returnTypeBox.add(returnTypeText);
      returnTypeBox.position.setZ(0.1);
      returnTypeText.position.setZ(0.1);
      let methodParameterOffset: number = -0.5;
      // Parameter List
      method.parameters.forEach((parameterOfMethod, idx) => {
        const parameterTextGeometry = new TextGeometry(
          '•' + parameterOfMethod.name + ' : ' + parameterOfMethod.type,
          {
            font: ImmersiveView.instance.font,
            size: 0.07,
            height: 0.04,
            depth: 0.01,
            curveSegments: 12,
          }
        );
        const parameterMaterial = new THREE.MeshBasicMaterial({
          color: 0xf00f0f,
          wireframe: false,
        });
        const parameterText = new THREE.Mesh(
          parameterTextGeometry,
          parameterMaterial
        );
        parameterText.geometry.center();
        parameterText.geometry.computeBoundingBox();
        const whd = new THREE.Vector3();
        parameterText.geometry.boundingBox?.getSize(whd);
        parameterText.position.setY(-0.5 + whd.y * idx);
        methodParameterOffset = methodParameterOffset + whd.y * idx;
        ourGroup.add(parameterText);
      });
      // Move the return Type below all Parameters
      returnTypeBox.position.setY(-0.5 + methodParameterOffset);

      this.positionInSphereRadius2(ourGroup, 115, 180, sphere, 1.5); // + 25 * idx
      // Calculate Box Size
      const aabb = new THREE.Box3();
      aabb.setFromObject(ourGroup);
      const requiredSpace = this.calculateAngleOfObject(
        aabb.min,
        aabb.max,
        sphere.position,
        10 //provides an offset such that the object are not touching each other
      );
      methodenMeshList.push(new ObjectSizeList(ourGroup, requiredSpace));
    });
    let looper: number = 0;
    let currentAngleLevel = 361;

    do {
      currentAngleLevel = methodenMeshList.reduce((pre, cur) => {
        return pre + cur.angleSize;
      }, 0);
      if (currentAngleLevel > 360) {
        methodenMeshList.forEach((ele) => {
          this.positionInSphereRadius2(
            ele.object3d,
            115,
            180,
            sphere,
            1.5 + looper
          );
          // Calculate Box Size
          const aabb = new THREE.Box3();
          aabb.setFromObject(ele.object3d);
          const requiredSpace = this.calculateAngleOfObject(
            aabb.min,
            aabb.max,
            sphere.position,
            10 //provides an offset such that the object are not touching each other
          );
          ele.angleSize = requiredSpace;
        });
      } else {
        methodenMeshList.reduce((prev, ele) => {
          this.positionInSphereRadius2(
            ele.object3d,
            115,
            180 + prev + ele.angleSize / 2,
            sphere,
            1.5 + looper
          );
          this.scene.add(ele.object3d);
          return ele.angleSize + prev;
        }, 0);
      }
      looper++;
    } while (currentAngleLevel > 360 && looper < 5);
  }
  private calculateAngleOfObject(
    min: THREE.Vector3,
    max: THREE.Vector3,
    startpoint: THREE.Vector3
  ): number;
  private calculateAngleOfObject(
    min: THREE.Vector3,
    max: THREE.Vector3,
    startpoint: THREE.Vector3,
    marginInPercent: number
  ): number;
  private calculateAngleOfObject(
    min: THREE.Vector3,
    max: THREE.Vector3,
    startpoint: THREE.Vector3,
    marginInPercent?: number
  ): number {
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
    if (marginInPercent != undefined)
      return angleDegrees * (1 + marginInPercent / 100);
    return angleDegrees;
  }

  // Deprecated use positionInSphereRadius2
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

  box(widthOrignal: number, heightOriginal: number, depthOriginal: number) {
    // Src: https://github.com/mrdoob/three.js/blob/master/examples/webgl_lines_dashed.html

    const width: number = widthOrignal * 0.5,
      height: number = heightOriginal * 0.5,
      depth: number = depthOriginal * 0.5;

    const geometry = new THREE.BufferGeometry();
    const position = [];

    position.push(
      -width,
      -height,
      -depth,
      -width,
      height,
      -depth,

      -width,
      height,
      -depth,
      width,
      height,
      -depth,

      width,
      height,
      -depth,
      width,
      -height,
      -depth,

      width,
      -height,
      -depth,
      -width,
      -height,
      -depth,

      -width,
      -height,
      depth,
      -width,
      height,
      depth,

      -width,
      height,
      depth,
      width,
      height,
      depth,

      width,
      height,
      depth,
      width,
      -height,
      depth,

      width,
      -height,
      depth,
      -width,
      -height,
      depth,

      -width,
      -height,
      -depth,
      -width,
      -height,
      depth,

      -width,
      height,
      -depth,
      -width,
      height,
      depth,

      width,
      height,
      -depth,
      width,
      height,
      depth,

      width,
      -height,
      -depth,
      width,
      -height,
      depth
    );

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(position, 3)
    );

    return geometry;
  }
}

function benderhelper(
  geometry: THREE.BufferGeometry,
  axis: string,
  angle: number
) {
  // Inspired by https://github.com/Sean-Bradley/Bender/blob/main/src/client/bender.ts
  let theta = 0;
  if (angle == 0) return;
  //Load all Positions
  const pos = geometry.attributes.position.array;

  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    const z = pos[i + 2];

    switch (axis) {
      case 'x':
        theta = z * angle;
        break;
      case 'y':
        theta = x * angle;
        break;
      default: //z
        theta = x * angle;
        break;
    }
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    switch (axis) {
      case 'x':
        pos[i] = x;
        pos[i + 1] = (y - 1.0 / angle) * cosTheta + 1.0 / angle;
        pos[i + 2] = -(y - 1.0 / angle) * sinTheta;
        break;
      case 'y':
        pos[i] = -(z - 1.0 / angle) * sinTheta;
        pos[i + 1] = y;
        pos[i + 2] = (z - 1.0 / angle) * cosTheta + 1.0 / angle;
        break;
      default: //z
        pos[i] = -(y - 1.0 / angle) * sinTheta;
        pos[i + 1] = (y - 1.0 / angle) * cosTheta + 1.0 / angle;
        pos[i + 2] = z;
        break;
    }
  }
}
