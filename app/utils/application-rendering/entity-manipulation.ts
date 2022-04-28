import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';
import THREE, { PerspectiveCamera, Vector3 } from 'three';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import {
  Class, Package,
} from '../landscape-schemes/structure-data';
import { DynamicLandscapeData, isSpan, Span } from '../landscape-schemes/dynamic-data';
import { spanIdToClass } from '../landscape-structure-helpers';
import { removeHighlighting } from './highlighting';

/**
   * Opens a given component mesh.
   *
   * @param mesh Component mesh which shall be opened
   * @param applicationObject3D Application object which contains the mesh
   */
export function openComponentMesh(mesh: ComponentMesh, applicationObject3D: ApplicationObject3D) {
  if (mesh.opened) { return; }

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
    const childMesh = applicationObject3D.getBoxMeshbyModelId(childComponent.id);
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
export function closeComponentMesh(mesh: ComponentMesh, applicationObject3D: ApplicationObject3D) {
  if (!mesh.opened) { return; }

  mesh.height = mesh.layout.height;

  // Reset y coordinate
  mesh.position.y -= 1.5 / 2;
  // Set y coordinate according to closed component height
  mesh.position.y += mesh.layout.height / 2;

  mesh.opened = false;
  Labeler.positionBoxLabel(mesh);

  const childComponents = mesh.dataModel.subPackages;
  childComponents.forEach((childComponent) => {
    const childMesh = applicationObject3D.getBoxMeshbyModelId(childComponent.id);
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
  const application = applicationObject3D.dataModel;

  // Close each component
  application.packages.forEach((component) => {
    const componentMesh = applicationObject3D.getBoxMeshbyModelId(component.id);
    if (componentMesh instanceof ComponentMesh) {
      closeComponentMesh(componentMesh, applicationObject3D);
    }
  });
}

/**
     * Takes a component and open all children component meshes recursively
     *
     * @param component Component of which the children shall be opened
     * @param applicationObject3D Application object which contains the component
     */
export function openComponentsRecursively(component: Package,
  applicationObject3D: ApplicationObject3D) {
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
  applicationObject3D.dataModel.packages.forEach((child) => {
    const mesh = applicationObject3D.getBoxMeshbyModelId(child.id);
    if (mesh !== undefined && mesh instanceof ComponentMesh) {
      openComponentMesh(mesh, applicationObject3D);
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
export function toggleComponentMeshState(mesh: ComponentMesh,
  applicationObject3D: ApplicationObject3D) {
  if (mesh.opened) {
    closeComponentMesh(mesh, applicationObject3D);
  } else {
    openComponentMesh(mesh, applicationObject3D);
  }
}

/**
   * Takes a set of open component ids and opens them.
   *
   * @param applicationObject3D Application object which contains the components
   * @param openComponentIds Set with ids of opened components
   */
export function restoreComponentState(applicationObject3D: ApplicationObject3D,
  openComponentIds: Set<string>) {
  openComponentIds.forEach((componentId) => {
    const componentMesh = applicationObject3D.getBoxMeshbyModelId(componentId);
    if (componentMesh instanceof ComponentMesh) {
      openComponentMesh(componentMesh, applicationObject3D);
    }
  });
}

/**
   * Opens components of the application until at least two components are visible.
   *
   * @param applicationObject3D Application object
   */
export function applyDefaultApplicationLayout(applicationObject3D: ApplicationObject3D) {
  function applyComponentLayout(appObject3D: ApplicationObject3D, components: Package[]) {
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

  applyComponentLayout(applicationObject3D, applicationObject3D.dataModel.packages);
}

/**
   * Moves camera to a specified position.
   *
   * @param centerPoint Offset of application
   * @param camera Camera which shall be positioned
   * @param layoutPos Desired position
   * @param applicationObject3D Contains all application meshes
   */
export function applyCameraPosition(centerPoint: THREE.Vector3, camera: THREE.PerspectiveCamera,
  layoutPos: THREE.Vector3, applicationObject3D: ApplicationObject3D) {
  layoutPos.sub(centerPoint);

  applicationObject3D.localToWorld(layoutPos);

  // Move camera on to given position
  camera.position.set(layoutPos.x, layoutPos.y, layoutPos.z);
}

/**
   * Moves camera such that a specified model is in focus
   *
   * @param emberModel Model of interest
   * @param applicationCenter Offset for position calculation
   * @param camera Camera which shall be moved
   * @param applicationObject3D Object which contains all application meshes
   */
export function moveCameraTo(model: Class | Span, applicationCenter: THREE.Vector3,
  camera: PerspectiveCamera, applicationObject3D: ApplicationObject3D, cameraTarget: THREE.Vector3, dynamicData: DynamicLandscapeData) {
  if (isSpan(model)) {
    const traceOfSpan = dynamicData.find(
      (trace) => trace.traceId === model.traceId,
    );

    if (!traceOfSpan) {
      return;
    }

    const { dataModel: application } = applicationObject3D;

    const sourceClass = spanIdToClass(application, traceOfSpan, model.parentSpanId);
    const targetClass = spanIdToClass(application, traceOfSpan, model.spanId);

    if (sourceClass && targetClass) {
      const sourceClazzMesh = applicationObject3D.getBoxMeshbyModelId(sourceClass.id);
      const targetClazzMesh = applicationObject3D.getBoxMeshbyModelId(targetClass.id);

      if (sourceClazzMesh instanceof ClazzMesh && targetClazzMesh instanceof ClazzMesh) {
        const sourceLayoutPos = new THREE.Vector3().copy(sourceClazzMesh.layout.position);
        const targetLayoutPos = new THREE.Vector3().copy(targetClazzMesh.layout.position);

        const directionVector = targetLayoutPos.sub(sourceLayoutPos);

        const middleLayoutPos = sourceLayoutPos.add(directionVector.divideScalar(2));
        applyCameraPosition(applicationCenter, camera, middleLayoutPos, applicationObject3D);
        cameraTarget.copy(middleLayoutPos);
      }
    } else if (sourceClass || targetClass) {
      const existendClass = (sourceClass || targetClass)!;

      const clazzMesh = applicationObject3D.getBoxMeshbyModelId(existendClass.id);

      if (clazzMesh instanceof ClazzMesh) {
        const classLayoutPos = new THREE.Vector3().copy(clazzMesh.layout.position);

        const directionVector = new Vector3().sub(classLayoutPos);

        const middleLayoutPos = classLayoutPos.add(directionVector.divideScalar(2));
        applyCameraPosition(applicationCenter, camera, middleLayoutPos, applicationObject3D);
        cameraTarget.copy(middleLayoutPos);
      }
    }
  } else {
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(model.id);
    if (clazzMesh instanceof ClazzMesh) {
      const layoutPos = new THREE.Vector3().copy(clazzMesh.layout.position);
      applyCameraPosition(applicationCenter, camera, layoutPos, applicationObject3D);
      cameraTarget.copy(clazzMesh.position);
    }
  }
}
