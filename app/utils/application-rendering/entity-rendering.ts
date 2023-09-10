import * as THREE from 'three';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import { ApplicationColors } from 'explorviz-frontend/services/configuration';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import AnimationMesh from 'explorviz-frontend/view-objects/3d/animation-mesh';
import { Class, Package } from '../landscape-schemes/structure-data';

const tmpMatrix = new THREE.Matrix4();

/**
 * Takes an application mesh, computes it position and adds it to the application object.
 *
 * @param mesh Mesh which should be added to the application
 * @param applicationObject3D Object which contains all application meshes
 */
export function addMeshToApplication(
  mesh: BoxMesh,
  applicationObject3D: ApplicationObject3D
) {
  const applicationCenter = applicationObject3D.layout.center;

  const centerPoint = mesh.layout.center;

  centerPoint.sub(applicationCenter);

  mesh.position.copy(centerPoint);
  applicationObject3D.add(mesh);

  // console.log(applicationObject3D.uuid)

  // applObj3D = applicationObject3D
}

/**
 * Sets the visibility of a mesh according to the opened state of the parent component.
 *
 * @param mesh Object of which the visibility shall be recalculated
 * @param applicationMesh Object which contains all application objects
 */
export function updateMeshVisiblity(
  mesh: ComponentMesh | ClazzMesh,
  applicationObject3D: ApplicationObject3D
) {
  const { parent } = mesh.dataModel;

  if (parent === undefined) {
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshbyModelId(parent.id);
  if (parentMesh instanceof ComponentMesh) {
    mesh.visible = parentMesh.opened;
  }
}

/**
 * Creates, positiones and adds component and clazz meshes to a given application object.
 *
 * @param component Data model for the component which shall be added to the scene
 * @param applicationObject3D Object to which the component mesh and its children are added
 * @param applicationColors Contains color objects for components and clazzes
 * @param componentLevel
 */
export function addComponentAndChildrenToScene(
  component: Package,
  applicationObject3D: ApplicationObject3D,
  applicationColors: ApplicationColors,
  componentLevel = 1
) {
  const application = applicationObject3D.data.application;
  const componentLayout = applicationObject3D.getBoxLayout(component.id);
  const applicationLayout = applicationObject3D.getBoxLayout(application.id);

  if (componentLayout === undefined || applicationLayout === undefined) {
    return;
  }

  const {
    componentOddColor,
    componentEvenColor,
    clazzColor,
    highlightedEntityColor,
  } = applicationColors;

  // Set color alternating (e.g. light and dark green) according to component level
  const color =
    componentLevel % 2 === 0 ? componentEvenColor : componentOddColor;
  // const mesh = new ComponentMesh(
  //   componentLayout,
  //   component,
  //   color,
  //   highlightedEntityColor
  // );

  const open = Math.random() > 0.5;
  const instanceIndex = applicationObject3D.getNextInstanceIndex();
  tmpMatrix.makeScale(
    componentLayout.width,
    open ? 1.5 : componentLayout.height,
    componentLayout.depth
  );
  const position = componentLayout.center.sub(
    applicationObject3D.layout.center
  );
  if (open) {
    position.y -= 0.5 * componentLayout.height;
    position.y += 1.5 / 2;
  }
  tmpMatrix.setPosition(position);
  applicationObject3D.instancedMesh.setMatrixAt(instanceIndex, tmpMatrix);
  applicationObject3D.instancedMesh.setColorAt(instanceIndex, color);

  // addMeshToApplication(mesh, applicationObject3D);
  // updateMeshVisiblity(mesh, applicationObject3D);

  const clazzes = component.classes;
  const children = component.subPackages;

  // Add clazzes of given component
  clazzes.forEach((clazz: Class) => {
    const clazzLayout = applicationObject3D.getBoxLayout(clazz.id);

    if (clazzLayout === undefined) {
      return;
    }

    const clazzMesh = new ClazzMesh(
      clazzLayout,
      clazz,
      clazzColor,
      highlightedEntityColor
    );
    addMeshToApplication(clazzMesh, applicationObject3D);
    updateMeshVisiblity(clazzMesh, applicationObject3D);
  });

  // Add components with alternating colors (e.g. dark and light green)
  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(
      child,
      applicationObject3D,
      applicationColors,
      componentLevel + 1
    );
  });
}

/**
 * Creates a FoundationMesh and adds it to the given application object.
 * Additionally, all children of the foundation (components and clazzes)
 * are added to the application.
 *
 * @param applicationObject3D Object which shall contain all application meshes
 * @param applicationColors Object which defines the colors for different application entities
 */
export function addFoundationAndChildrenToApplication(
  applicationObject3D: ApplicationObject3D,
  applicationColors: ApplicationColors
) {
  const application = applicationObject3D.data.application;
  const applicationLayout = applicationObject3D.layout;

  if (!applicationLayout) {
    return;
  }

  applicationObject3D.resetInstanceIndex();

  const { foundationColor, highlightedEntityColor } = applicationColors;

  const mesh = new FoundationMesh(
    applicationLayout,
    application,
    foundationColor,
    highlightedEntityColor
  );

  addMeshToApplication(mesh, applicationObject3D);

  // console.log(applicationObject3D)
  const children = application.packages;

  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(
      child,
      applicationObject3D,
      applicationColors
    );
  });
}

/**
 * Creates a GlobeMesh and adds it to the given application object.
 * Communication that come from the outside
 *
 * @param applicationObject3D Object which shall contain all application meshes
 * @param applicationColors Object which defines the colors for different application entities
 */
export function addGlobeToApplication(
  appObject3D: ApplicationObject3D
): AnimationMesh {
  const geometry = new THREE.SphereGeometry(2.5, 15, 15);
  const texture = new THREE.TextureLoader().load('images/earth-map.jpg');
  const material = new THREE.MeshPhongMaterial({ map: texture });
  const mesh = new AnimationMesh(geometry, material);
  const applicationCenter = appObject3D.layout.center;

  const centerPoint = new THREE.Vector3(-5, 0, -5);

  centerPoint.sub(applicationCenter);

  mesh.position.copy(centerPoint);
  // mesh.rotateY(-2.45);

  appObject3D.add(mesh);

  return mesh;
}

export function repositionGlobeToApplication(
  appObject3D: ApplicationObject3D,
  globe: THREE.Mesh
) {
  const applicationCenter = appObject3D.layout.center;
  const centerPoint = new THREE.Vector3(-5, 0, -5);

  centerPoint.sub(applicationCenter);

  globe.position.copy(centerPoint);
}
