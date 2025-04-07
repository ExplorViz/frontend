import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import {
  getAllClassesInApplication,
  getAllClassIdsInApplication,
  getAllPackagesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import { getClassAncestorPackages } from 'explorviz-frontend/src/utils/class-helpers';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  isTrace,
  Span,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  isApplication,
  isClass,
  isPackage,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getClassesInPackage } from 'explorviz-frontend/src/utils/package-helpers';

// #region Add/Update/Remove Highlighting

/**
 * (Un)Highlights a given mesh
 *
 * @param modelId Either component, class or class communication id of model which shall be (un)highlighted
 * @param applicationObject3D Application mesh which contains the mesh
 */
export function setHighlightStatusForMesh(
  modelId: string,
  applicationObject3D: ApplicationObject3D,
  highlighted: boolean
) {
  const mesh = applicationObject3D.getMeshById(modelId) as
    | ComponentMesh
    | ClazzMesh
    | ClazzCommunicationMesh
    | FoundationMesh;
  if (!mesh) {
    return;
  }

  if (
    !applicationObject3D.highlightedEntity ||
    isTrace(applicationObject3D.highlightedEntity)
  ) {
    applicationObject3D.highlightedEntity = new Set<string>();
  }

  if (highlighted) {
    mesh.highlight();
    applicationObject3D.highlightedEntity.add(modelId);
  } else {
    mesh.unhighlight();
    applicationObject3D.highlightedEntity.delete(modelId);
  }
}

/**
 * Highlights a trace.
 *
 * @param trace Trace which shall be highlighted
 * @param step Step of the trace which shall be highlighted. Default is 1
 * @param applicationObject3D Application mesh which contains the trace
 */
export function highlightTrace(
  trace: Trace,
  traceStep: string,
  applicationObject3D: ApplicationObject3D,
  classCommunications: ClassCommunication[],
  landscapeStructureData: StructureLandscapeData,
  opacity: number
) {
  removeAllHighlightingFor(applicationObject3D);

  applicationObject3D.highlightedEntity = trace;

  // All classes in application
  const allClassesAsArray = getAllClassesInApplication(
    applicationObject3D.dataModel.application
  );
  const allClasses = new Set<Class>(allClassesAsArray);

  const involvedClasses = new Set<Class>();

  let highlightedSpan: Span | undefined;

  const hashCodeToClassMap = getHashCodeToClassMap(landscapeStructureData);

  // Find span matching traceStep
  trace.spanList.forEach((span) => {
    if (span.spanId === traceStep) {
      highlightedSpan = span;
    }
  });

  if (highlightedSpan === undefined) {
    return;
  }

  // Get both classes involved in the procedure call of the highlighted span
  let highlightedSpanParentClass: Class | undefined;
  const highlightedSpanClass = hashCodeToClassMap.get(
    highlightedSpan.methodHash
  );
  trace.spanList.forEach((span) => {
    if (highlightedSpan === undefined) {
      return;
    }
    if (span.spanId === highlightedSpan.parentSpanId) {
      highlightedSpanParentClass = hashCodeToClassMap.get(span.methodHash);
    }
  });

  // Mark all classes in span as involved in the trace
  trace.spanList.forEach((span) => {
    const spanClass = hashCodeToClassMap.get(span.methodHash);

    if (spanClass) {
      involvedClasses.add(spanClass);
    }
  });

  const spanIdToClass = new Map<string, Class>();

  // Map all spans to their respective clazz
  trace.spanList.forEach((span) => {
    const { methodHash, spanId } = span;

    const clazz = hashCodeToClassMap.get(methodHash);

    if (clazz !== undefined) {
      spanIdToClass.set(spanId, clazz);
    }
  });

  // Strings of format sourceClass_to_targetClass
  const classesThatCommunicateInTrace = new Set<string>();

  trace.spanList.forEach((span) => {
    const { parentSpanId, spanId } = span;

    if (parentSpanId === '') {
      return;
    }

    const sourceClass = spanIdToClass.get(parentSpanId);
    const targetClass = spanIdToClass.get(spanId);

    if (sourceClass !== undefined && targetClass !== undefined) {
      classesThatCommunicateInTrace.add(
        `${sourceClass.id}_to_${targetClass.id}`
      );
    }
  });

  classCommunications.forEach((communication) => {
    const { sourceClass, targetClass, id } = communication;

    const commMesh = applicationObject3D.getCommMeshByModelId(id);

    // Highlight communication mesh that matches highlighted span
    if (
      (sourceClass === highlightedSpanParentClass &&
        targetClass === highlightedSpanClass) ||
      (sourceClass === highlightedSpanClass &&
        targetClass === highlightedSpanParentClass)
    ) {
      commMesh?.highlight();
    }

    // Turn all communication meshes that are not involved in the trace transparent
    if (
      !classesThatCommunicateInTrace.has(
        `${sourceClass.id}_to_${targetClass.id}`
      ) &&
      !classesThatCommunicateInTrace.has(
        `${targetClass.id}_to_${sourceClass.id}`
      )
    ) {
      commMesh?.turnTransparent(opacity);
    }
  });

  const involvedClassesArray = Array.from(involvedClasses);
  const nonInvolvedClasses = new Set(
    [...allClasses].filter(
      (x) => !involvedClassesArray.find((elem) => elem.id == x.id)
    )
  );

  const componentSet = new Set<Package>();

  involvedClasses.forEach((classModel) => {
    getClassAncestorPackages(classModel).forEach((pckg) =>
      componentSet.add(pckg)
    );
  });

  // turn classes and packages transparent, which are not involved in the trace
  nonInvolvedClasses.forEach((classModel) => {
    const classMesh = applicationObject3D.getBoxMeshByModelId(classModel.id);
    const componentMesh = applicationObject3D.getBoxMeshByModelId(
      classModel.parent.id
    );
    if (
      classMesh instanceof ClazzMesh &&
      componentMesh instanceof ComponentMesh &&
      componentMesh.opened
    ) {
      classMesh.turnTransparent(opacity);
    }
    turnComponentAndAncestorsTransparent(
      classModel.parent,
      applicationObject3D,
      componentSet,
      opacity
    );
  });
}

/**
 * Highlights the stored highlighted entity again.
 *
 * @param applicationObject3D Application mesh which contains the highlighted entity
 */
export function updateHighlighting(
  applicationObject3DList: ApplicationObject3D[],
  communicationMeshes: ClazzCommunicationMesh[],
  opacity: number
) {
  // Set everything transparent at the beginning
  const allClassIds = new Set(
    turnComponentsAndClassesTransparent(applicationObject3DList, opacity)
  );
  turnCommunicationTransparent(communicationMeshes, opacity);

  // Get all class ids of all selected components, including highlighted classes
  const allSelectedClassIds = getAllSelectedClassIds(applicationObject3DList);

  // Add classes which are involved via communication with selected classes
  let allInvolvedClassIds = getAllInvolvedClassIds(
    communicationMeshes,
    allSelectedClassIds
  );

  // Before applying the highlighting, selected classes should also count as involved
  allInvolvedClassIds = new Set([
    ...allSelectedClassIds,
    ...allInvolvedClassIds,
  ]);

  if (allInvolvedClassIds.size === 0) {
    // Turn all classes opaque again if nothing is selected
    turnClassesOpaque(allClassIds, applicationObject3DList);
    turnCommunicationOpaque(allClassIds, communicationMeshes);
  } else {
    // Turn classes and communication opaque again with respect to selected and involved classes
    turnClassesOpaque(allInvolvedClassIds, applicationObject3DList);
    turnCommunicationOpaque(allSelectedClassIds, communicationMeshes);
  }
}

/**
 * Restores default color and transparency for all application meshes
 *
 * @param applicationObject3D Application mesh of which the highlighting should be removed
 */
export function removeAllHighlightingFor(
  applicationObject3D: ApplicationObject3D
) {
  const meshes = applicationObject3D.getAllMeshes();

  meshes.forEach((mesh) => {
    removeHighlighting(
      mesh as ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
      applicationObject3D
    );
  });
  applicationObject3D.highlightedEntity = null;
}

export function removeHighlighting(
  mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh | FoundationMesh,
  applicationObject3D: ApplicationObject3D
) {
  if (mesh.highlighted)
    setHighlightStatusForMesh(mesh.getModelId(), applicationObject3D, false);
}

// #endregion

// #region Opacity / Transparency functions
/**
 * Returns a list of all classes from all applications and sets every class and every package containing a class in its subpackage-hierarchy transparent
 *
 * @param applicationObject3DList List of applications to return all classes from
 * @param opacity Opacity for transparency
 */

export function turnComponentsAndClassesTransparent(
  applicationObject3DList: ApplicationObject3D[],
  opacity: number
) {
  let allClassIds: string[] = [];
  applicationObject3DList.forEach((application) => {
    const classIdsInApplication = getAllClassIdsInApplication(
      application.dataModel.application
    );
    classIdsInApplication.forEach((classId) => {
      // set everything transparent at the beginning
      const classMesh = application.getMeshById(classId);
      if (classMesh instanceof ClazzMesh) {
        classMesh.turnTransparent(opacity);
        turnComponentAndAncestorsTransparent(
          classMesh.dataModel.parent,
          application,
          new Set(),
          opacity
        );
      }
    });
    allClassIds = [...allClassIds, ...classIdsInApplication];
  });

  return allClassIds;
}

export function turnCommunicationTransparent(
  communicationMeshes: ClazzCommunicationMesh[],
  opacity: number
) {
  communicationMeshes.forEach((link) => {
    link.turnTransparent(opacity);
  });
}

/**
 * Turns the mesh which belongs to a component and all its child meshes if
 * they are not part of the ignorableComponents set.
 *
 * @param component Component which shall be turned transparent
 * @param applicationObject3D Application mesh which contains the component
 * @param ignorableComponents Set of components which shall not be turned transparent
 */
export function turnComponentAndAncestorsTransparent(
  component: Package,
  applicationObject3D: ApplicationObject3D,
  ignorableComponents: Set<Package>,
  opacity: number
) {
  if (ignorableComponents.has(component)) {
    return;
  }

  ignorableComponents.add(component);

  const { parent } = component;

  const componentMesh = applicationObject3D.getBoxMeshByModelId(component.id);

  if (parent === undefined) {
    if (componentMesh instanceof ComponentMesh) {
      componentMesh.turnTransparent(opacity);
    }
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshByModelId(parent.id);
  if (
    componentMesh instanceof ComponentMesh &&
    parentMesh instanceof ComponentMesh &&
    parentMesh.opened
  ) {
    componentMesh.turnTransparent(opacity);
  }
  turnComponentAndAncestorsTransparent(
    parent,
    applicationObject3D,
    ignorableComponents,
    opacity
  );
}

export function turnComponentAndAncestorsOpaque(
  component: Package,
  applicationObject3D: ApplicationObject3D,
  ignorableComponents: Set<Package>
) {
  if (ignorableComponents.has(component)) {
    return;
  }

  ignorableComponents.add(component);

  const { parent } = component;

  const componentMesh = applicationObject3D.getBoxMeshByModelId(component.id);

  if (parent === undefined) {
    if (componentMesh instanceof ComponentMesh) {
      componentMesh.turnOpaque();
    }
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshByModelId(parent.id);
  if (
    componentMesh instanceof ComponentMesh &&
    parentMesh instanceof ComponentMesh &&
    parentMesh.opened
  ) {
    componentMesh.turnOpaque();
  }
  turnComponentAndAncestorsOpaque(
    parent,
    applicationObject3D,
    ignorableComponents
  );
}

function turnClassesOpaque(
  allInvolvedClassIds: Set<string>,
  applicationObject3DList: ApplicationObject3D[]
) {
  allInvolvedClassIds.forEach((classId) => {
    for (const application of applicationObject3DList) {
      const classMesh = application.getBoxMeshByModelId(classId);

      if (classMesh instanceof ClazzMesh) {
        classMesh.turnOpaque();
        turnComponentAndAncestorsOpaque(
          classMesh.dataModel.parent,
          application,
          new Set()
        );
        break;
      }
    }
  });
}

function turnCommunicationOpaque(
  selectedClassIds: Set<string>,
  communicationMeshes: ClazzCommunicationMesh[]
) {
  communicationMeshes.forEach((comm) => {
    let hasSelectedClass = false;
    comm.dataModel.communication.getClasses().forEach((communicationClass) => {
      if (selectedClassIds.has(communicationClass.id)) {
        hasSelectedClass = true;
      }
    });
    if (hasSelectedClass || comm.highlighted) {
      comm.turnOpaque();
    }
  });
}
// #endregion

// #region util functions

export function isHighlightableMesh(
  object: THREE.Object3D
): object is HighlightableMesh {
  return (
    object instanceof ComponentMesh ||
    object instanceof ClazzMesh ||
    object instanceof ClazzCommunicationMesh ||
    object instanceof FoundationMesh
  );
}

function getAllSelectedClassIds(
  applicationObject3DList: ApplicationObject3D[]
) {
  let allSelectedClassIds = new Set<string>();
  applicationObject3DList.forEach((application: ApplicationObject3D) => {
    const highlightedEntityIds = application.highlightedEntity;
    if (!highlightedEntityIds || isTrace(highlightedEntityIds)) {
      return;
    }

    highlightedEntityIds.forEach((entityId: string) => {
      const baseMesh = application.getMeshById(entityId);
      if (!baseMesh) {
        return;
      }
      baseMesh.highlight();
      const selectedClassIds = new Set<string>();

      const model = (
        baseMesh as
          | FoundationMesh
          | ComponentMesh
          | ClazzMesh
          | ClazzCommunicationMesh
      ).dataModel;
      // Add all clazzes which are contained in a component
      if (isPackage(model)) {
        getClassesInPackage(model).forEach((classInPackage) =>
          selectedClassIds.add(classInPackage.id)
        );
        // Add class itself
      } else if (isClass(model)) {
        selectedClassIds.add(model.id);
      } else if (isApplication(model)) {
        getAllPackagesInApplication(model).forEach((pckg) => {
          getClassesInPackage(pckg).forEach((classInPackage) =>
            selectedClassIds.add(classInPackage.id)
          );
        });
      }
      allSelectedClassIds = new Set([
        ...allSelectedClassIds,
        ...selectedClassIds,
      ]);
    });
  });
  return allSelectedClassIds;
}

function getAllInvolvedClassIds(
  communicationMeshes: ClazzCommunicationMesh[],
  allSelectedClassIds: Set<string>
) {
  const allInvolvedClassIds = new Set<string>();
  communicationMeshes.forEach((comm) => {
    const involvedClasses = comm.dataModel.communication.getClasses();

    let hasSelectedClass = false;
    involvedClasses.forEach((involvedClass) => {
      if (allSelectedClassIds.has(involvedClass.id)) {
        hasSelectedClass = true;
      }
    });

    // Add classes which communicate directly with selected entities
    if (comm.highlighted || hasSelectedClass) {
      involvedClasses.forEach((involvedClass) => {
        allInvolvedClassIds.add(involvedClass.id);
      });
    }
  });
  return allInvolvedClassIds;
}
// #endregion

// #region type definitions
export type HightlightComponentArgs = {
  entityType: string;
  entityId: string;
  color?: THREE.Color;
};

export type HighlightableMesh =
  | FoundationMesh
  | ComponentMesh
  | ClazzMesh
  | ClazzCommunicationMesh;
// #endregion
