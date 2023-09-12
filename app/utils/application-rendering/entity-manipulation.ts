import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import { Class, Package } from '../landscape-schemes/structure-data';
import {
  DynamicLandscapeData,
  isSpan,
  Span,
} from '../landscape-schemes/dynamic-data';
import { spanIdToClass } from '../landscape-structure-helpers';
import { removeHighlighting } from './highlighting';
import CameraControls from './camera-controls';

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
  components.forEach((component) => {
    const ancestorMesh = application.getBoxMeshbyModelId(component.id);
    if (ancestorMesh instanceof ComponentMesh) {
      openComponentMesh(ancestorMesh, application);
    }
  });
}

/**
 * Opens a given component mesh.
 *
 * @param mesh Component mesh which shall be opened
 * @param applicationObject3D Application object which contains the mesh
 */
export function openComponentMesh(
  mesh: ComponentMesh,
  applicationObject3D: ApplicationObject3D
) {
  if (mesh.opened) {
    return;
  }

  mesh.height = 1.5;

  // Reset y coordinate
  mesh.position.y -= mesh.layout.height / 2;
  // Set y coordinate according to open component height
  mesh.position.y += 1.5 / 2;

  mesh.opened = true;
  mesh.visible = true;
  Labeler.positionBoxLabel(mesh);

  const childComponents = mesh.dataModel.subPackages;
  childComponents.forEach((childComponent) => {
    const childMesh = applicationObject3D.getBoxMeshbyModelId(
      childComponent.id
    );
    if (childMesh) {
      childMesh.visible = true;
    }
  });

  const clazzes = mesh.dataModel.classes;
  clazzes.forEach((clazz) => {
    const childMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id);
    if (childMesh) {
      childMesh.visible = true;
    }
  });
}

/**
 * Closes a given component mesh.
 *
 * @param mesh Component mesh which shall be closed
 * @param applicationObject3D Application object which contains the mesh
 */
export function closeComponentMesh(
  mesh: ComponentMesh,
  applicationObject3D: ApplicationObject3D
) {
  if (!mesh.opened) {
    return;
  }

  mesh.height = mesh.layout.height;

  // Reset y coordinate
  mesh.position.y -= 1.5 / 2;
  // Set y coordinate according to closed component height
  mesh.position.y += mesh.layout.height / 2;

  mesh.opened = false;
  Labeler.positionBoxLabel(mesh);

  const childComponents = mesh.dataModel.subPackages;
  childComponents.forEach((childComponent) => {
    const childMesh = applicationObject3D.getBoxMeshbyModelId(
      childComponent.id
    );
    if (childMesh instanceof ComponentMesh) {
      childMesh.visible = false;
      if (childMesh.opened) {
        closeComponentMesh(childMesh, applicationObject3D);
      }
      // Reset highlighting if highlighted entity is no longer visible
      if (childMesh.highlighted) {
        removeHighlighting(applicationObject3D);
      }
    }
  });

  const clazzes = mesh.dataModel.classes;
  clazzes.forEach((clazz) => {
    const childMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id);
    if (childMesh instanceof ClazzMesh) {
      childMesh.visible = false;
      // Reset highlighting if highlighted entity is no longer visible
      if (childMesh.highlighted) {
        removeHighlighting(applicationObject3D);
      }
    }
  });
}

/**
 * Closes all component meshes which are currently added to the applicationObject3D
 *
 * @param applicationObject3D Application object which contains the components
 */
export function closeAllComponents(applicationObject3D: ApplicationObject3D) {
  applicationObject3D.content.openOrCloseAllComponents(false);
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
    const mesh = applicationObject3D.getBoxMeshbyModelId(child.id);
    if (mesh !== undefined && mesh instanceof ComponentMesh) {
      openComponentMesh(mesh, applicationObject3D);
    }
    openComponentsRecursively(child, applicationObject3D);
  });
}

/**
 * Opens all component meshes which are currently added to the applicationObject3D
 *
 * @param applicationObject3D Application object which contains the components
 */
export function openAllComponents(applicationObject3D: ApplicationObject3D) {
  applicationObject3D.content.openOrCloseAllComponents(true);
}

/**
 * Opens a component mesh which is closed and vice versa
 *
 * @param mesh Mesh which shall be opened / closed
 * @param applicationObject3D Application object which contains the mesh
 */
export function toggleComponentMeshState(
  mesh: ComponentMesh,
  applicationObject3D: ApplicationObject3D
) {
  if (mesh.opened) {
    closeComponentMesh(mesh, applicationObject3D);
  } else {
    openComponentMesh(mesh, applicationObject3D);
  }
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

    const component = components.objectAt(0);

    if (component !== undefined) {
      const mesh = appObject3D.getBoxMeshbyModelId(component.id);
      if (mesh instanceof ComponentMesh) {
        openComponentMesh(mesh, applicationObject3D);
      }

      applyComponentLayout(appObject3D, component.subPackages);
    }
  }

  applyComponentLayout(
    applicationObject3D,
    applicationObject3D.data.application.packages
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

    const { application } = applicationObject3D.data;

    const sourceClass = spanIdToClass(
      application,
      traceOfSpan,
      model.parentSpanId
    );
    const targetClass = spanIdToClass(application, traceOfSpan, model.spanId);

    if (sourceClass && targetClass) {
      const sourceClazzMesh = applicationObject3D.getBoxMeshbyModelId(
        sourceClass.id
      );
      const targetClazzMesh = applicationObject3D.getBoxMeshbyModelId(
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

      const clazzMesh = applicationObject3D.getBoxMeshbyModelId(
        existendClass.id
      );

      if (clazzMesh instanceof ClazzMesh) {
        cameraControls.focusCameraOn(0.6, clazzMesh);
      }
    }
  } else {
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(model.id);
    if (clazzMesh instanceof ClazzMesh) {
      cameraControls.focusCameraOn(0.6, clazzMesh);
    }
  }
}
