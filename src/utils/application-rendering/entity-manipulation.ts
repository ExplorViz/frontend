import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassIdsInApplication,
  getAllPackageIdsInApplications,
} from 'explorviz-frontend/src/utils/application-helpers';
import CameraControls from 'explorviz-frontend/src/utils/application-rendering/camera-controls';
import {
  DynamicLandscapeData,
  isSpan,
  Span,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { spanIdToClass } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';

const {
  closeComponents,
  hideClasses,
  hideComponents,
  openComponents,
  showClasses,
  showComponents,
} = useVisualizationStore.getState().actions;

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
  const componentIds = components.map((component) => component.id);
  openComponents(componentIds);

  const containedClassIds: string[] = [];
  components.forEach((component) => {
    containedClassIds.push(
      ...component.classes.map((classModel) => classModel.id)
    );
  });
  showClasses(containedClassIds);
}

/**
 * Opens the component and its ancestors
 *
 * @param components List of components which shall be opened
 */
export function openComponentAndAncestor(component: Package | Class) {
  const ancestors = getAllAncestorComponents(component);
  const componentIds = ancestors.map(
    (ancestorComponent) => ancestorComponent.id
  );
  openComponents(componentIds);

  const containedClassIds: string[] = [];
  ancestors.forEach((component) => {
    containedClassIds.push(
      ...component.classes.map((classModel) => classModel.id)
    );
  });
  showClasses(containedClassIds);
}

/**
 * Opens a given component.
 *
 * @param component Component which shall be opened
 */
export function openComponent(component: Package) {
  const isOpen = !useVisualizationStore
    .getState()
    .closedComponentIds.has(component.id);
  if (isOpen) {
    return;
  }

  openComponents([component.id]);
  showComponents(component.subPackages.map((pckg) => pckg.id));
  showClasses(component.classes.map((classModel) => classModel.id));
}

/**
 * Closes a given component.
 *
 * @param component Component which shall be closed
 */
export function closeComponent(component: Package, hide = false) {
  const isOpen = !useVisualizationStore
    .getState()
    .closedComponentIds.has(component.id);
  if (hide) {
    hideComponents([component.id]);
  }

  if (!isOpen) {
    return;
  }

  closeComponents([component.id]);

  hideClasses(component.classes.map((classModel) => classModel.id));

  const childComponents = component.subPackages;
  childComponents.forEach((childComponent) => {
    closeComponent(childComponent, true);
  });
}

/**
 * Closes all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function closeAllComponentsInApplication(application: Application) {
  const packageIds = getAllPackageIdsInApplications(application);
  const topLevelPackageIds = application.packages.map((pkg) => pkg.id);
  const packageIdsToHide = packageIds.filter(
    (id) => !topLevelPackageIds.includes(id)
  );
  closeComponents(packageIds);
  hideComponents(packageIdsToHide);
  hideClasses(getAllClassIdsInApplication(application));
}

export function closeAllComponentsInLandscape() {
  const applications = Array.from(
    useApplicationRepositoryStore.getState().getAll()
  ).map((app) => app.application);
  const packageIds: string[] = [];
  let topLevelComponentIds: string[] = [];
  applications.forEach((app) => {
    packageIds.push(...getAllPackageIdsInApplications(app));
    topLevelComponentIds = topLevelComponentIds.concat(
      app.packages.map((pkg) => pkg.id)
    );
  });

  closeComponents(packageIds);
  hideComponents(
    Array.from(new Set(packageIds).difference(new Set(topLevelComponentIds)))
  );

  const allClassIds: string[] = [];
  applications.forEach((app) => {
    allClassIds.push(...getAllClassIdsInApplication(app));
  });
  hideClasses(allClassIds);
}

/**
 * Opens all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function openAllComponentsInApplication(application: Application) {
  openComponents(getAllPackageIdsInApplications(application));
  showClasses(getAllClassIdsInApplication(application));
}

export function openAllComponentsInLandscape() {
  const applications = Array.from(
    useApplicationRepositoryStore.getState().getAll()
  ).map((app) => app.application);
  const packageIds: string[] = [];
  applications.forEach((app) => {
    packageIds.push(...getAllPackageIdsInApplications(app));
  });

  openComponents(packageIds);
  showComponents(packageIds);

  const allClassIds: string[] = [];
  applications.forEach((app) => {
    allClassIds.push(...getAllClassIdsInApplication(app));
  });
  showClasses(allClassIds);
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
