import * as THREE from 'three';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import AnimationMesh from 'explorviz-frontend/view-objects/3d/animation-mesh';
import { Class, Package } from '../landscape-schemes/structure-data';
import { ApplicationColors } from 'explorviz-frontend/services/user-settings';
import SemanticZoomManager from 'explorviz-frontend/view-objects/3d/application/utils/semantic-zoom-manager';
//import { createClazzTextLabelForZoomLevel as createClazzTextLabelForZoomLevel } from './labeler';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

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
  const layoutPosition = mesh.layout.position;
  const applicationCenter = applicationObject3D.layout.center;

  const centerPoint = new THREE.Vector3(
    layoutPosition.x + mesh.layout.width / 2.0,
    layoutPosition.y + mesh.layout.height / 2.0,
    layoutPosition.z + mesh.layout.depth / 2.0
  );

  centerPoint.sub(applicationCenter);

  mesh.position.copy(centerPoint);
  mesh.saveOriginalAppearence();
  applicationObject3D.add(mesh);
  SemanticZoomManager.instance.add(mesh);
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
  applicationFont: Font,
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
  const mesh = new ComponentMesh(
    componentLayout,
    component,
    color,
    highlightedEntityColor
  );
  // const recipe = new Recipe();
  // //recipe.setColor(new THREE.Color(255, 0, 0));
  // //recipe.setPositionY(2);
  // const appearenceForOne = new AppearenceExtension();
  // appearenceForOne.setRecipe(recipe);

  // mesh.setAppearence(1, appearenceForOne);

  addMeshToApplication(mesh, applicationObject3D);
  updateMeshVisiblity(mesh, applicationObject3D);

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
      clazzColor,
      highlightedEntityColor
    );

    // Set the basic height changing recipe as the new appearence and register it as Level 1

    // Change the Geometry to a Sphere
    //recipe.setGeometry(new THREE.SphereGeometry(1, 8, 8));

    // appearenceHeight.setRecipe(recipe);
    // clazzMesh.setAppearence(1, appearenceHeight);

    // Create another mesh for an extended Appearence as Level 2
    // const geometry = new THREE.SphereGeometry(1, 8, 8);
    // const material = new THREE.MeshBasicMaterial({ color: 0xff0a00 });

    // const sph = new THREE.Mesh(geometry, material);
    // and register it
    // const appearenceMethodProportion = new AppearenceExtension();
    // // applay the height change aswell
    // appearenceMethodProportion.setRecipe(recipe);
    // //appearenceMethodProportion.addMesh(sph);
    // clazzMesh.setAppearence(2, appearenceMethodProportion);

    // Add different Text Levels

    // Long Text with small font
    // const textclose = createClazzTextLabelForZoomLevel(
    //   clazzMesh,
    //   applicationFont,
    //   new THREE.Color(0xffffff),
    //   0.66,
    //   20
    // );
    // // Change position to the top of the Box. Move it up by the half of the parent size
    // textclose?.position.setY(orignalHeight / 2 + 0.02);
    // // Shorter Text with larger font
    // const textintermedian = createClazzTextLabelForZoomLevel(
    //   clazzMesh,
    //   applicationFont,
    //   new THREE.Color(0xffffff),
    //   1,
    //   10
    // );
    // // Change position to the top of the Box. Move it up by the half of the parent size
    // textintermedian?.position.setY(orignalHeight / 2 + 0.02);

    // if (textclose) appearenceMethodProportion.addMesh(textclose, true);
    // if (textintermedian) appearenceHeight.addMesh(textintermedian, true);

    // if (clazzMesh instanceof ClazzMesh) {
    //   appearenceClassForOne.callBeforeActivation = (cu) => {
    //     cu.labelMesh.visible = false;
    //   };
    //   appearenceClassForOne.callAfterDeactivation = (cu) => {
    //     cu.labelMesh.visible = true;
    //   };

    //   lodLayer2.callBeforeActivation = (cu) => {
    //     cu.labelMesh.visible = false;
    //   };
    //   lodLayer2.callAfterDeactivation = (cu) => {
    //     cu.labelMesh.visible = true;
    //   };
    // }

    // // Playground to extend the extended Appearence by another Mesh
    // // like a sub sub Appearence
    // const subgeometry = new THREE.SphereGeometry(1, 8, 8);
    // const submaterial = new THREE.MeshBasicMaterial({ color: 0xff0a00 });

    // const subsph = new THREE.Mesh(subgeometry, submaterial);
    // const sublodLayer2 = new AppearenceExtension();
    // sublodLayer2.addMesh(subsph);

    // sph.setAppearence()

    addMeshToApplication(clazzMesh, applicationObject3D);
    updateMeshVisiblity(clazzMesh, applicationObject3D);
    // if (orignalHeight) {
    //   recipe.changeAxisSizeAccordingToCurrentPosition(
    //     clazzMesh,
    //     orignalHeight,
    //     'y'
    //   );
    // }
  });

  // Add components with alternating colors (e.g. dark and light green)
  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(
      child,
      applicationObject3D,
      applicationColors,
      applicationFont,
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
  applicationColors: ApplicationColors,
  applicationFont: Font
) {
  const application = applicationObject3D.data.application;
  const applicationLayout = applicationObject3D.layout;

  if (!applicationLayout) {
    return;
  }

  const { foundationColor, highlightedEntityColor } = applicationColors;

  const mesh = new FoundationMesh(
    applicationLayout,
    application,
    foundationColor,
    highlightedEntityColor
  );

  addMeshToApplication(mesh, applicationObject3D);

  const children = application.packages;

  children.forEach((child: Package) => {
    addComponentAndChildrenToScene(
      child,
      applicationObject3D,
      applicationColors,
      applicationFont
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
