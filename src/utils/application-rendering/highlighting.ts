import ClazzCommunicationMesh from '../../view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from '../../view-objects/3d/application/component-mesh';
import ClazzMesh from '../../view-objects/3d/application/clazz-mesh';
import ApplicationObject3D from '../../view-objects/3d/application/application-object-3d';
import ClazzCommuMeshDataModel from '../../view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import {
  Class,
  isClass,
  isPackage,
  Package,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import {
  DrawableClassCommunication,
  isDrawableClassCommunication,
} from './class-communication-computer';
import { getAllClassesInApplication } from '../application-helpers';
import { getClassesInPackage } from '../package-helpers';
import { getClassAncestorPackages } from '../class-helpers';
import { Span, Trace } from '../landscape-schemes/dynamic-data';
import { getHashCodeToClassMap } from '../landscape-structure-helpers';
/**
 * Restores default color and transparency for all application meshes
 *
 * @param applicationObject3D Application mesh of which the highlighting should be removed
 */
export function removeHighlighting(applicationObject3D: ApplicationObject3D) {
  const meshes = applicationObject3D.getAllMeshes();

  meshes.forEach((mesh) => {
    mesh.unhighlight();
  });
  applicationObject3D.highlightedEntity = null;
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

  const componentMesh = applicationObject3D.getBoxMeshbyModelId(component.id);

  if (parent === undefined) {
    if (componentMesh instanceof ComponentMesh) {
      componentMesh.turnTransparent(opacity);
    }
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshbyModelId(parent.id);
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

/**
 * Highlights a given mesh
 *
 * @param mesh Either component, clazz or clazz communication mesh which shall be highlighted
 * @param applicationObject3D Application mesh which contains the mesh
 * @param toggleHighlighting Determines whether highlighting a already highlighted entity
 *                           causes removal of all highlighting
 */
export function highlight(
  mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh,
  applicationObject3D: ApplicationObject3D,
  communication: DrawableClassCommunication[],
  opacity: number,
  toggleHighlighting = true
) {
  // Reset highlighting if highlighted mesh is clicked
  if (mesh.highlighted && toggleHighlighting) {
    removeHighlighting(applicationObject3D);
    return;
  }

  // Reset highlighting
  removeHighlighting(applicationObject3D);
  const model =
    mesh.dataModel instanceof ClazzCommuMeshDataModel
      ? mesh.dataModel.drawableClassCommus.at(0)
      : mesh.dataModel;

  if (!model) {
    return;
  }

  // Highlight the entity itself
  mesh.highlight();
  applicationObject3D.highlightedEntity = mesh;

  // Now proceed to make unhighlighted entities transparent

  // All clazzes in application
  const application = applicationObject3D.dataModel;
  const allClazzesAsArray = getAllClassesInApplication(application);
  const allClazzes = new Set<Class>(allClazzesAsArray);

  // Get all clazzes in current component
  const containedClazzes = new Set<Class>();

  // Add all clazzes which are contained in a component
  if (isPackage(model)) {
    getClassesInPackage(model).forEach((clss) => containedClazzes.add(clss));
    // Add clazz itself
  } else if (isClass(model)) {
    containedClazzes.add(model);
    // Add source and target clazz of communication
  } else if (isDrawableClassCommunication(model)) {
    containedClazzes.add(model.sourceClass);
    containedClazzes.add(model.targetClass);
    // Given model is not supported
  } else {
    return;
  }

  const allInvolvedClazzes = new Set<Class>(containedClazzes);

  communication.forEach((comm) => {
    const { sourceClass, targetClass, id } = comm;

    const containedClazzesArray = Array.from(containedClazzes);
    // Add clazzes which communicate directly with highlighted entity
    // For a highlighted communication all involved clazzes are already known
    if (
      containedClazzesArray.find((clazz) => clazz.id == sourceClass.id) &&
      !isDrawableClassCommunication(model)
    ) {
      allInvolvedClazzes.add(targetClass);
    } else if (
      containedClazzesArray.find((clazz) => clazz.id == targetClass.id) &&
      !isDrawableClassCommunication(model)
    ) {
      allInvolvedClazzes.add(sourceClass);
      // Hide communication which is not directly connected to highlighted entity
    } else if (
      !containedClazzesArray.find((clazz) => clazz.id == sourceClass.id) ||
      !containedClazzesArray.find((clazz) => clazz.id == targetClass.id)
    ) {
      const commMesh = applicationObject3D.getCommMeshByModelId(id);
      if (commMesh) {
        commMesh.turnTransparent(opacity);
      }
      // communication is self-looped and not equal to the highlighted one, i.e. model
    } else if (
      isDrawableClassCommunication(model) &&
      sourceClass.id === targetClass.id &&
      model !== comm
    ) {
      const commMesh = applicationObject3D.getCommMeshByModelId(id);
      if (commMesh) {
        commMesh.turnTransparent(opacity);
      }
    }
  });

  const allInvolvedClazzesArray = Array.from(allInvolvedClazzes);
  const nonInvolvedClazzes = new Set(
    [...allClazzes].filter(
      (x) => !allInvolvedClazzesArray.find((clazz) => clazz.id == x.id)
    )
  );

  const componentSet = new Set<Package>();

  allInvolvedClazzes.forEach((clazz) => {
    getClassAncestorPackages(clazz).forEach((pckg) => componentSet.add(pckg));
  });

  // Turn non involved clazzes transparent
  nonInvolvedClazzes.forEach((clazz) => {
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id);
    const componentMesh = applicationObject3D.getBoxMeshbyModelId(
      clazz.parent.id
    );

    if (
      clazzMesh instanceof ClazzMesh &&
      componentMesh instanceof ComponentMesh &&
      componentMesh.opened
    ) {
      clazzMesh.turnTransparent(opacity);
    }
    turnComponentAndAncestorsTransparent(
      clazz.parent,
      applicationObject3D,
      componentSet,
      opacity
    );
  });
}

/**
 * Highlights the mesh which belongs to a given data model
 *
 * @param entity Component or clazz of which the corresponding mesh shall be highlighted
 * @param applicationObject3D Application mesh which contains the entity
 */
export function highlightModel(
  entity: Package | Class,
  applicationObject3D: ApplicationObject3D,
  communication: DrawableClassCommunication[],
  opacity: number
) {
  const mesh = applicationObject3D.getBoxMeshbyModelId(entity.id);
  if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh) {
    highlight(mesh, applicationObject3D, communication, opacity);
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
  communication: DrawableClassCommunication[],
  landscapeStructureData: StructureLandscapeData,
  opacity: number
) {
  removeHighlighting(applicationObject3D);

  applicationObject3D.highlightedEntity = trace;

  const drawableComms = communication;

  // All clazzes in application
  const allClazzesAsArray = getAllClassesInApplication(
    applicationObject3D.dataModel
  );
  const allClazzes = new Set<Class>(allClazzesAsArray);

  const involvedClazzes = new Set<Class>();

  let highlightedSpan: Span | undefined;

  const hashCodeToClassMap = getHashCodeToClassMap(landscapeStructureData);

  // find span matching traceStep
  trace.spanList.forEach((span) => {
    if (span.spanId === traceStep) {
      highlightedSpan = span;
    }
  });

  if (highlightedSpan === undefined) {
    return;
  }

  // get both classes involved in the procedure call of the highlighted span
  let highlightedSpanParentClass: Class | undefined;
  const highlightedSpanClass = hashCodeToClassMap.get(highlightedSpan.hashCode);
  trace.spanList.forEach((span) => {
    if (highlightedSpan === undefined) {
      return;
    }
    if (span.spanId === highlightedSpan.parentSpanId) {
      highlightedSpanParentClass = hashCodeToClassMap.get(span.hashCode);
    }
  });

  // mark all classes in span as involved in the trace
  trace.spanList.forEach((span) => {
    const spanClass = hashCodeToClassMap.get(span.hashCode);

    if (spanClass) {
      involvedClazzes.add(spanClass);
    }
  });

  const spanIdToClass = new Map<string, Class>();

  // map all spans to their respective clazz
  trace.spanList.forEach((span) => {
    const { hashCode, spanId } = span;

    const clazz = hashCodeToClassMap.get(hashCode);

    if (clazz !== undefined) {
      spanIdToClass.set(spanId, clazz);
    }
  });

  // strings of format sourceClass_to_targetClass
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

  drawableComms.forEach((comm) => {
    const { sourceClass, targetClass, id } = comm;

    const commMesh = applicationObject3D.getCommMeshByModelId(id);

    // highlight communication mesh that matches highlighted span
    if (
      (sourceClass === highlightedSpanParentClass &&
        targetClass === highlightedSpanClass) ||
      (sourceClass === highlightedSpanClass &&
        targetClass === highlightedSpanParentClass)
    ) {
      commMesh?.highlight();
    }

    // turn all communication meshes that are not involved in the trace transparent
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

  const involvedClazzesArray = Array.from(involvedClazzes);
  const nonInvolvedClazzes = new Set(
    [...allClazzes].filter(
      (x) => !involvedClazzesArray.find((clazz) => clazz.id == x.id)
    )
  );

  const componentSet = new Set<Package>();

  involvedClazzes.forEach((clazz) => {
    getClassAncestorPackages(clazz).forEach((pckg) => componentSet.add(pckg));
  });

  // turn clazzes and packages transparent, which are not involved in the trace
  nonInvolvedClazzes.forEach((clazz) => {
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id);
    const componentMesh = applicationObject3D.getBoxMeshbyModelId(
      clazz.parent.id
    );
    if (
      clazzMesh instanceof ClazzMesh &&
      componentMesh instanceof ComponentMesh &&
      componentMesh.opened
    ) {
      clazzMesh.turnTransparent(opacity);
    }
    turnComponentAndAncestorsTransparent(
      clazz.parent,
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
  applicationObject3D: ApplicationObject3D,
  communication: DrawableClassCommunication[],
  opacity: number
) {
  if (!applicationObject3D.highlightedEntity) {
    return;
  }

  if (applicationObject3D.highlightedEntity instanceof ClazzCommunicationMesh) {
    const possiblyNewMeshInstance = applicationObject3D.getCommMeshByModelId(
      applicationObject3D.highlightedEntity.dataModel.id
    );

    if (possiblyNewMeshInstance) {
      applicationObject3D.highlightedEntity = possiblyNewMeshInstance;
    } else {
      // communication mesh no longer visible
      removeHighlighting(applicationObject3D);
    }
  }

  // Re-run highlighting for entity
  if (
    applicationObject3D.highlightedEntity instanceof ClazzMesh ||
    applicationObject3D.highlightedEntity instanceof ComponentMesh ||
    applicationObject3D.highlightedEntity instanceof ClazzCommunicationMesh
  ) {
    highlight(
      applicationObject3D.highlightedEntity,
      applicationObject3D,
      communication,
      opacity,
      false
    );
  }
}
