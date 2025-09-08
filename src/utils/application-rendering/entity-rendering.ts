import {
  ExplorVizColors,
  useUserSettingsStore,
} from 'explorviz-frontend/src/stores/user-settings';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import AnimationMesh from 'explorviz-frontend/src/view-objects/3d/animation-mesh.ts';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh.ts';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import {
  closeComponent,
  openComponent,
  openComponentAndAncestor,
} from './entity-manipulation';

import CommunicationRendering from 'explorviz-frontend/src/utils/application-rendering/communication-rendering';

/**
 * Takes an application mesh, computes it position and adds it to the application object.
 *
 * @param mesh Mesh which should be added to the application
 * @param app3D Object which contains all application meshes
 */
export function addMeshToApplication(
  mesh: BoxMesh,
  app3D: ApplicationObject3D
) {
  const layoutPosition = mesh.layout.position;

  // Box meshes origin is in the center
  const centerPoint = new THREE.Vector3(
    layoutPosition.x + mesh.layout.width / 2.0,
    layoutPosition.y + mesh.layout.height / 2.0,
    layoutPosition.z + mesh.layout.depth / 2.0
  );

  // Offset position with applications position
  const appLayoutPosition = new THREE.Vector3(
    app3D.layout.positionX,
    app3D.layout.positionY,
    app3D.layout.positionZ
  );

  mesh.position.copy(centerPoint);
  mesh.position.sub(appLayoutPosition);

  mesh.saveOriginalAppearence();
  app3D.add(mesh);
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

  const parentMesh = applicationObject3D.getBoxMeshByModelId(parent.id);
  if (parentMesh instanceof ComponentMesh) {
    mesh.visible = parentMesh.opened;
  }
}

/**
 * Creates, positiones and adds component and clazz meshes to a given application object.
 *
 * @param component Data model for the component which shall be added to the scene
 * @param applicationObject3D Object to which the component mesh and its children are added
 * @param colors Contains color objects for components and clazzes
 * @param componentLevel
 */
export function addComponentAndChildrenToScene(
  component: Package,
  applicationObject3D: ApplicationObject3D,
  colors: ExplorVizColors,
  font: Font,
  componentLevel = 1
) {
  // TODO:
  return;
  const application = applicationObject3D.dataModel.application;
  const componentLayout = applicationObject3D.getBoxLayout(component.id);
  const applicationLayout = applicationObject3D.getBoxLayout(application.id);

  if (componentLayout === undefined || applicationLayout === undefined) {
    console.error('Layout undefined for:', component);
    return;
  }

  const {
    componentOddColor,
    componentEvenColor,
    classColor,
    highlightedEntityColor,
  } = colors;

  // Set color alternating (e.g. light and dark green) according to component level
  const color =
    componentLevel % 2 === 0 ? componentEvenColor : componentOddColor;
  const componentMesh = new ComponentMesh({
    layout: componentLayout,
    component,
    defaultColor: color,
    highlightingColor: highlightedEntityColor,
  });

  // automatically open packages when zooming in.
  // mesh.callBeforeAppearenceZero = () => {
  //   console.log('Return home Component!!!');
  // };
  //mesh.overrideVisibility = true;
  // Alter the prio to VIP, such that it gets triggered first and without a delay.
  componentMesh.prio = 1;
  // Define function
  const triggerOpen = () => {};

  addMeshToApplication(componentMesh, applicationObject3D);
  updateMeshVisiblity(componentMesh, applicationObject3D);

  const clazzes = component.classes;
  const children = component.subPackages;

  // Add clazzes of given component
  clazzes.forEach((clazz: Class) => {
    const clazzLayout = applicationObject3D.getBoxLayout(clazz.id);

    if (clazzLayout === undefined) {
      return;
    }

    // Create class mesh
    const clazzMesh = new ClazzMesh(
      clazzLayout,
      clazz,
      classColor,
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
      colors,
      font,
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
 * @param colors Object which defines the colors for different application entities
 */
export function addFoundationAndChildrenToApplication(
  applicationObject3D: ApplicationObject3D,
  colors: ExplorVizColors,
  font: Font
) {
  const application = applicationObject3D.dataModel.application;
  const applicationLayout = applicationObject3D.layout;

  if (!applicationLayout) {
    return;
  }

  // const { foundationColor, highlightedEntityColor } = colors;

  // const foundationMesh = new FoundationMesh(
  //   applicationLayout,
  //   application,
  //   foundationColor,
  //   highlightedEntityColor
  // );
  // addMeshToApplication(foundationMesh, applicationObject3D);

  const children = application.packages;

  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(child, applicationObject3D, colors, font);
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

export function updateApplicationObject3DAfterUpdate(
  applicationObject3D: ApplicationObject3D,
  appCommRendering: CommunicationRendering,
  renderComm: boolean,
  font: Font,
  linkUpdater: () => void
) {
  if (renderComm) {
    appCommRendering.addCommunication(
      applicationObject3D,
      useUserSettingsStore.getState().visualizationSettings
    );
  }
  linkUpdater?.();
}
