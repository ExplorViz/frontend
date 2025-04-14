import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  DynamicLandscapeData,
  isSpan,
  Span,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { spanIdToClass } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import CameraControls from 'explorviz-frontend/src/utils/application-rendering/camera-controls';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import { ExplorVizColors } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';

/**
 * Given a package or class, returns a list of all ancestor components.
 *
 * @param entity Package or class of which the ancestors shall be returned (entity is not included in the list)
 */
export function getAllAncestorComponents(entity: Package | Class): Package[] {
  if (entity.parent === undefined) {
    return [];
  }

  return [entity.parent, ...getAllAncestorComponents(entity.parent)];
}

/**
 * Opens all components which are given in a list.
 *
 * @param components List of components which shall be opened
 */
export function openComponentsByList(components: Package[]) {
  components.forEach((component) => {
    openComponent(component);
  });
}

/**
 * Opens the component and its ancestors
 *
 * @param components List of components which shall be opened
 */
export function openComponentAndAncestor(component: Package | Class) {
  const ancestors = getAllAncestorComponents(component);
  ancestors.forEach((ancestorComponent) => {
    openComponent(ancestorComponent);
  });
}

/**
 * Opens a given component.
 *
 * @param component Component which shall be opened
 * @param app3D Application object which contains the mesh
 */
export function openComponent(component: Package) {
  const visualizationStore = useVisualizationStore.getState();
  const visualizationState = visualizationStore.actions.getComponentState(
    component.id
  );
  if (visualizationState.isOpen) {
    return;
  }

  // add back later
  /*   if (getStoredSettings().enableAnimations.value) {
    gsap.to(mesh, {
      duration: 0.25,
      height: OPENED_COMPONENT_HEIGHT,
    });

    gsap.to(mesh.position, {
      duration: 0.25,
      y: yPos,
    });
  } else { */
  /*     mesh.height = OPENED_COMPONENT_HEIGHT;
    mesh.position.y = yPos; */
  /*   } */

  visualizationStore.actions.updateComponentState(component.id, {
    isOpen: true,
    isVisible: true,
  });

  // mesh.saveOriginalAppearence();
  // Labeler.positionBoxLabel(component);

  const childComponents = component.subPackages;
  childComponents.forEach((childComponent) => {
    visualizationStore.actions.updateComponentState(childComponent.id, {
      isVisible: true,
    });
  });

  const classes = component.classes;
  classes.forEach((classModel) => {
    /*     const childMesh = app3D.getBoxMeshByModelId(clazz.id);
    if (childMesh) { */
    /*       vizualizationStore.actions.updateComponentState(clazz.id, {
        isVisible: true,
      }); */
    // childMesh.saveOriginalAppearence();
    /*     } */
  });
}

/**
 * Closes a given component.
 *
 * @param component Component which shall be closed
 */
export function closeComponent(component: Package) {
  const visualizationStore = useVisualizationStore.getState();
  const visualizationState = visualizationStore.actions.getComponentState(
    component.id
  );
  if (!visualizationState.isOpen) {
    return;
  }

  // Position is in center of box, need to subtract apps layout position
  /*   const yPos =
    mesh.layout.positionY +
    CLOSED_COMPONENT_HEIGHT / 2 -
    app3D.layout.positionY;

  if (getStoredSettings().enableAnimations.value) {
    gsap.to(mesh, {
      duration: 0.5,
      height: CLOSED_COMPONENT_HEIGHT,
    });

    gsap.to(mesh.position, {
      duration: 0.5,
      y: yPos,
    });
  } else {
    mesh.height = CLOSED_COMPONENT_HEIGHT;
    mesh.position.y = yPos;
  } */

  visualizationStore.actions.updateComponentState(component.id, {
    isOpen: false,
  });

  /*   Labeler.positionBoxLabel(mesh);
  mesh.saveOriginalAppearence(); */

  const childComponents = component.subPackages;
  childComponents.forEach((childComponent) => {
    visualizationStore.actions.updateComponentState(childComponent.id, {
      isVisible: false,
    });
    if (
      visualizationStore.actions.getComponentState(childComponent.id).isOpen
    ) {
      closeComponent(childComponent);
    }
    // Reset highlighting if highlighted entity is no longer visible
    /*       if (!keepHighlighted && childMesh.highlighted) {
        removeHighlighting(childMesh, app3D);
      }
      childMesh.saveOriginalAppearence(); */
  });

  /*   const clazzes = mesh.dataModel.classes;
  clazzes.forEach((clazz) => {
    const childMesh = app3D.getBoxMeshByModelId(clazz.id);
    if (childMesh instanceof ClazzMesh) {
      childMesh.visible = false;
      // Reset highlighting if highlighted entity is no longer visible
      if (!keepHighlighted && childMesh.highlighted) {
        removeHighlighting(childMesh, app3D);
      }
    }
  }); */
}

/**
 * Closes all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function closeAllComponents(application: Application) {
  // Close each component
  application.packages.forEach((component) => {
    closeComponent(component);
  });
}

/**
 * Takes a component and open all children component meshes recursively
 *
 * @param component Component of which the children shall be opened
 */
export function openComponentsRecursively(component: Package) {
  openComponent(component);

  const subComponents = component.subPackages;
  subComponents.forEach((subComponent) => {
    openComponent(component);
    // TODO:Fix message sender
    // useMessageSenderStore
    //   .getState()
    //   .sendComponentUpdate(
    //     applicationObject3D.getModelId(),
    //     mesh.getModelId(),
    //     mesh.opened,
    //     mesh instanceof FoundationMesh
    //   );
    openComponentsRecursively(subComponent);
  });
}

/**
 * Takes a component and closes all its children components recursively
 *
 * @param component Component of which the children components shall be closed
 */
export function closeComponentsRecursively(component: Package) {
  const components = component.subPackages;
  components.forEach((subComponent) => {
    closeComponent(subComponent);
    // TODO: Fix message sender
    //   useMessageSenderStore
    //     .getState()
    //     .sendComponentUpdate(
    //       applicationObject3D.getModelId(),
    //       mesh.getModelId(),
    //       mesh.opened,
    //       mesh instanceof FoundationMesh
    //     );
    // }
    closeComponentsRecursively(subComponent);
  });
}

/**
 * Opens all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function openAllComponents(application: Application) {
  application.packages.forEach((childComponent) => {
    openComponent(childComponent);
    // ToDo: Fix message sender
    // useMessageSenderStore
    //   .getState()
    //   .sendComponentUpdate(
    //     applicationObject3D.getModelId(),
    //     mesh.getModelId(),
    //     mesh.opened,
    //     mesh instanceof FoundationMesh
    //   );
    openComponentsRecursively(childComponent);
  });
}

/**
 * Opens a component mesh which is closed and vice versa
 *
 * @param mesh Mesh which shall be opened / closed
 */
export function toggleComponentState(mesh: ComponentMesh) {
  if (mesh.opened) {
    closeComponent(mesh.dataModel);
  } else {
    openComponent(mesh.dataModel);
  }
}

/**
 * Takes a set of open component ids and opens them.
 *
 * @param applicationObject3D Application object which contains the components
 * @param openComponentIds Set with ids of opened components
 * @param transparentComponentIds Set with ids of transparent components
 */
export function restoreComponentState(
  applicationObject3D: ApplicationObject3D,
  openComponentIds?: Set<string>,
  transparentComponentIds?: Set<string>,
  opacity?: number
) {
  openComponentIds?.forEach((componentId) => {
    const boxMesh = applicationObject3D.getBoxMeshByModelId(componentId);

    if (boxMesh instanceof ComponentMesh) {
      openComponent(boxMesh.dataModel);
    }
  });

  transparentComponentIds?.forEach((componentId) => {
    const componentMesh = applicationObject3D.getBoxMeshByModelId(componentId);

    if (componentMesh) {
      if (
        componentMesh instanceof ClazzMesh &&
        componentMesh.dataModel.id.includes('new')
      ) {
        // Without this, a new created class will be transparent
      } else {
        componentMesh.turnTransparent(opacity);
      }
    }
  });
}

/**
 * Opens components of the application until at least two components are visible.
 *
 * @param applicationObject3D Application object
 */
export function applyDefaultApplicationLayout(
  applicationObject3D: ApplicationObject3D
) {
  function applyComponentLayout(
    appObject3D: ApplicationObject3D,
    components: Package[]
  ) {
    if (components.length > 1) {
      // There are two components on the first level
      // therefore, here is nothing to do
      return;
    }

    const component = components.at(0);

    if (component !== undefined) {
      const mesh = appObject3D.getBoxMeshByModelId(component.id);
      if (mesh instanceof ComponentMesh) {
        openComponent(mesh.dataModel);
      }

      applyComponentLayout(appObject3D, component.subPackages);
    }
  }

  applyComponentLayout(
    applicationObject3D,
    applicationObject3D.dataModel.application.packages
  );
}

/**
 * Moves camera such that a specified model is in focus
 *
 * @param emberModel Model of interest
 * @param applicationCenter Offset for position calculation
 * @param camera Camera which shall be moved
 * @param applicationObject3D Object which contains all application meshes
 */
export function moveCameraTo(
  model: Class | Span,
  applicationObject3D: ApplicationObject3D,
  dynamicData: DynamicLandscapeData,
  cameraControls: CameraControls
) {
  if (isSpan(model)) {
    const traceOfSpan = dynamicData.find(
      (trace) => trace.traceId === model.traceId
    );

    if (!traceOfSpan) {
      return;
    }

    const { application } = applicationObject3D.dataModel;

    const sourceClass = spanIdToClass(
      application,
      traceOfSpan,
      model.parentSpanId
    );
    const targetClass = spanIdToClass(application, traceOfSpan, model.spanId);

    if (sourceClass && targetClass) {
      const sourceClazzMesh = applicationObject3D.getBoxMeshByModelId(
        sourceClass.id
      );
      const targetClazzMesh = applicationObject3D.getBoxMeshByModelId(
        targetClass.id
      );

      if (
        sourceClazzMesh instanceof ClazzMesh &&
        targetClazzMesh instanceof ClazzMesh
      ) {
        cameraControls.focusCameraOn(0.6, sourceClazzMesh, targetClazzMesh);
      }
    } else if (sourceClass || targetClass) {
      const existendClass = (sourceClass || targetClass)!;

      const clazzMesh = applicationObject3D.getBoxMeshByModelId(
        existendClass.id
      );

      if (clazzMesh instanceof ClazzMesh) {
        cameraControls.focusCameraOn(0.6, clazzMesh);
      }
    }
  } else {
    const clazzMesh = applicationObject3D.getBoxMeshByModelId(model.id);
    if (clazzMesh instanceof ClazzMesh) {
      cameraControls.focusCameraOn(0.6, clazzMesh);
    }
  }
}

export function updateColors(
  scene: THREE.Scene,
  applicationColors: ExplorVizColors
) {
  scene.traverse((object3D) => {
    if (object3D instanceof BaseMesh) {
      object3D.updateColor();
    }
  });
  scene.background = applicationColors.backgroundColor;
}
