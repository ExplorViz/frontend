import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import * as Labeler from 'explorviz-frontend/src/utils/application-rendering/labeler';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import {
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
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
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
 * @param application Parent application object of the components
 */
export function openComponentsByList(
  components: Package[],
  application: ApplicationObject3D
) {
  let didOpenComponent = false;
  components.forEach((component) => {
    const ancestorMesh = application.getBoxMeshByModelId(component.id);
    if (ancestorMesh instanceof ComponentMesh && !ancestorMesh.opened) {
      didOpenComponent = true;
      openComponentMesh(ancestorMesh);
    }
  });
  return didOpenComponent;
}

/**
 * Opens the component and its ancestors
 *
 * @param components List of components which shall be opened
 * @param application Parent application object of the components
 */
export function openComponentAndAncestor(
  component: Package | Class,
  application: ApplicationObject3D
) {
  const ancestors = getAllAncestorComponents(component);
  ancestors.forEach((ancestorComponent) => {
    const ancestorMesh = application.getBoxMeshByModelId(ancestorComponent.id);
    if (ancestorMesh instanceof ComponentMesh && !ancestorMesh.opened)
      openComponentMesh(ancestorMesh);
  });
}

/**
 * Opens a given component mesh.
 *
 * @param mesh Component mesh which shall be opened
 * @param app3D Application object which contains the mesh
 */
export function openComponentMesh(mesh: ComponentMesh) {
  const visualizationStore = useVisualizationStore.getState();
  const visualizationState = visualizationStore.actions.getComponentState(
    mesh.getModelId()
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

  visualizationStore.actions.updateComponentState(mesh.getModelId(), {
    isOpen: true,
    isVisible: true,
  });

  // mesh.saveOriginalAppearence();
  Labeler.positionBoxLabel(mesh);

  const childComponents = mesh.dataModel.subPackages;
  childComponents.forEach((childComponent) => {
    visualizationStore.actions.updateComponentState(childComponent.id, {
      isVisible: true,
    });
  });

  const clazzes = mesh.dataModel.classes;
  clazzes.forEach((clazz) => {
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
 * Closes a given component mesh.
 *
 * @param mesh Component mesh which shall be closed
 * @param app3D Application object which contains the mesh
 */
export function closeComponentMesh(dataModel: Package) {
  const visualizationStore = useVisualizationStore.getState();
  const visualizationState = visualizationStore.actions.getComponentState(
    dataModel.id
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

  visualizationStore.actions.updateComponentState(dataModel.id, {
    isOpen: false,
  });

  /*   Labeler.positionBoxLabel(mesh);
  mesh.saveOriginalAppearence(); */

  const childComponents = dataModel.subPackages;
  childComponents.forEach((childComponent) => {
    visualizationStore.actions.updateComponentState(childComponent.id, {
      isVisible: false,
    });
    if (
      visualizationStore.actions.getComponentState(childComponent.id).isOpen
    ) {
      closeComponentMesh(childComponent);
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
 * Closes all component meshes which are currently added to the applicationObject3D
 *
 * @param applicationObject3D Application object which contains the components
 */
export function closeAllComponents(applicationObject3D: ApplicationObject3D) {
  const application = applicationObject3D.dataModel.application;

  // Close each component
  application.packages.forEach((component) => {
    const componentMesh = applicationObject3D.getBoxMeshByModelId(component.id);
    if (componentMesh instanceof ComponentMesh) {
      closeComponentMesh(componentMesh.dataModel);
    }
  });
}

/**
 * Takes a component and open all children component meshes recursively
 *
 * @param component Component of which the children shall be opened
 * @param applicationObject3D Application object which contains the component
 */
export function openComponentsRecursively(
  component: Package,
  applicationObject3D: ApplicationObject3D
) {
  const components = component.subPackages;
  components.forEach((child) => {
    const mesh = applicationObject3D.getBoxMeshByModelId(child.id);
    if (mesh !== undefined && mesh instanceof ComponentMesh && !mesh.opened) {
      // !mesh.opened needed!

      openComponentMesh(mesh);
      useMessageSenderStore
        .getState()
        .sendComponentUpdate(
          applicationObject3D.getModelId(),
          mesh.getModelId(),
          mesh.opened,
          mesh instanceof FoundationMesh
        );
    }
    openComponentsRecursively(child, applicationObject3D);
  });
}

/**
 * Takes a component and closes all children component meshes recursively
 *
 * @param component Component of which the children shall be closed
 * @param applicationObject3D Application object which contains the component
 */
export function closeComponentsRecursively(
  component: Package,
  applicationObject3D: ApplicationObject3D
) {
  const components = component.subPackages;
  components.forEach((child) => {
    const mesh = applicationObject3D.getBoxMeshByModelId(child.id);
    if (mesh !== undefined && mesh instanceof ComponentMesh && mesh.opened) {
      // mesh.opened needed!

      closeComponentMesh(mesh.dataModel);
      useMessageSenderStore
        .getState()
        .sendComponentUpdate(
          applicationObject3D.getModelId(),
          mesh.getModelId(),
          mesh.opened,
          mesh instanceof FoundationMesh
        );
    }
    closeComponentsRecursively(child, applicationObject3D);
  });
}

/**
 * Opens all component meshes which are currently added to the applicationObject3D
 *
 * @param applicationObject3D Application object which contains the components
 */
export function openAllComponents(applicationObject3D: ApplicationObject3D) {
  applicationObject3D.dataModel.application.packages.forEach((child) => {
    const mesh = applicationObject3D.getBoxMeshByModelId(child.id);
    if (mesh !== undefined && mesh instanceof ComponentMesh && !mesh.opened) {
      openComponentMesh(mesh);
      useMessageSenderStore
        .getState()
        .sendComponentUpdate(
          applicationObject3D.getModelId(),
          mesh.getModelId(),
          mesh.opened,
          mesh instanceof FoundationMesh
        );
    }
    openComponentsRecursively(child, applicationObject3D);
  });
}

/**
 * Opens a component mesh which is closed and vice versa
 *
 * @param mesh Mesh which shall be opened / closed
 * @param applicationObject3D Application object which contains the mesh
 */
export function toggleComponentMeshState(mesh: ComponentMesh) {
  if (mesh.opened) {
    closeComponentMesh(mesh.dataModel);
  } else {
    openComponentMesh(mesh);
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
      openComponentMesh(boxMesh);
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
        openComponentMesh(mesh);
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
