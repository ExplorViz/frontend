import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import {
  Application,
  Class,
  isApplication,
  isClass,
  isPackage,
  Package,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import {
  DrawableClassCommunication,
  isDrawableClassCommunication,
} from './class-communication-computer';
import { applicationHasClass, getAllClassesInApplication, getAllPackagesInApplication } from '../application-helpers';
import { getClassesInPackage } from '../package-helpers';
import { getClassAncestorPackages } from '../class-helpers';
import { isTrace, Span, Trace } from '../landscape-schemes/dynamic-data';
import { getApplicationFromClass, getHashCodeToClassMap } from '../landscape-structure-helpers';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
/**
 * Restores default color and transparency for all application meshes
 *
 * @param applicationObject3D Application mesh of which the highlighting should be removed
 */
export function removeAllHighlighting(applicationObject3D: ApplicationObject3D) {
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
 * Turns the mesh which belongs to a component and all its child meshes if
 * they are not part of the ignorableComponents set opaque.
 *
 * @param component Component which shall be turned opaque
 * @param applicationObject3D Application mesh which contains the component
 * @param ignorableComponents Set of components which shall not be turned opaque
 */

export function turnComponentAndAncestorsOpaque(
  component: Package,
  applicationObject3D: ApplicationObject3D,
  ignorableComponents: Set<Package>,
) {
  if (ignorableComponents.has(component)) {
    return;
  }

  ignorableComponents.add(component);

  const { parent } = component;

  const componentMesh = applicationObject3D.getBoxMeshbyModelId(component.id);

  if (parent === undefined) {
    if (componentMesh instanceof ComponentMesh) {
      componentMesh.turnOpaque();
    }
    return;
  }

  const parentMesh = applicationObject3D.getBoxMeshbyModelId(parent.id);
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
    ignorableComponents,
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
  applicationObject3DList: ApplicationObject3D[],
  communication: DrawableClassCommunication[],
  allLinks: ClazzCommunicationMesh[],
  opacity: number,
  toggleHighlighting = true,
) {
  // Reset highlighting if highlighted mesh is clicked
  // if (mesh.highlighted && toggleHighlighting) {
  //   removeAllHighlighting(applicationObject3D);
  //   return;
  // }

  // Reset highlighting
  //removeAllHighlighting(applicationObject3D); // TODO: auskommentiert wäre für Strg + Mausklick 

  const model =
    mesh.dataModel instanceof ClazzCommuMeshDataModel
      ? mesh.dataModel.drawableClassCommus.firstObject
      : mesh.dataModel;

  if (!model) {
    return;
  }


  // Highlight/unhighlight the entity itself
  if(mesh.highlighted){
    //TODO: toggleHighlighting Logik benutzen wenn toggleHighlighting auf true => alle highlights entfernen und alles opaque machen
    mesh.unhighlight();
    if(applicationObject3D.highlightedEntity && !isTrace(applicationObject3D.highlightedEntity)){
      applicationObject3D.highlightedEntity.delete(mesh.getModelId());
    }
  }else{
    mesh.highlight(); //TODO: Strg + Mausklick Logik => nur eine Sache highlightable innerhalb einer Application


    if(!(mesh instanceof ClazzCommunicationMesh)){

      // in case our newly highlighted mesh was transparend before:

      if(mesh instanceof ClazzMesh){
        mesh.turnOpaque(); // clazzes aren't turned opaque by belows function
        turnComponentAndAncestorsOpaque(
          mesh.dataModel.parent,
          applicationObject3D,
          new Set<Package>(),
        );
      }
      else if(mesh instanceof ComponentMesh){
        turnComponentAndAncestorsOpaque(
          mesh.dataModel,
          applicationObject3D,
          new Set<Package>(),
        );
      }
    }

    if(!applicationObject3D.highlightedEntity || isTrace(applicationObject3D.highlightedEntity)){
      applicationObject3D.highlightedEntity = new Map<string, BaseMesh>();
    }
    applicationObject3D.highlightedEntity.set(mesh.getModelId(), mesh); 
  }


  // Now proceed to make unhighlighted entities transparent

  // All clazzes from all applications
  let allClazzesArray: Class[] = []; 
  for(let application of applicationObject3DList){
    const allClazzesAsArray = getAllClassesInApplication(application.data.application);
    allClazzesArray = [...allClazzesArray, ...allClazzesAsArray];
  }
  const allClazzes = new Set<Class>(allClazzesArray);

  // Get all clazzes in current component
  let containedClazzes = new Set<Class>();

    applicationObject3DList.forEach((application : ApplicationObject3D) => {
      if(application.highlightedEntity && !isTrace(application.highlightedEntity)){
        application.highlightedEntity.forEach((entity : BaseMesh) => {
          const model = (entity as FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh).dataModel;
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
          }else if(isApplication(model)){
            getAllPackagesInApplication(model).forEach(pckg => {
              getClassesInPackage(pckg).forEach((clss) => containedClazzes.add(clss));
            })
          }
           else {
            return;
          }
        });
      }
    });

  console.log();

  if(containedClazzes.size === 0){
    // turn everything opaque by considering all clazzes as involved
   containedClazzes = allClazzes;
  }

  let allInvolvedClazzes = new Set<Class>(containedClazzes);
  
  for(let link of allLinks){
      link.turnOpaque(); // make all links opaque so only the right ones get transparent in the code below
  }
  
  communication.forEach((comm) => {

    const { sourceClass, targetClass, id } = comm;

    const containedClazzesArray = Array.from(containedClazzes);
    // Add clazzes which communicate directly with highlighted entity
    // For a highlighted communication all involved clazzes are already known
    if (
      containedClazzesArray.findBy('id', sourceClass.id) &&
      !isDrawableClassCommunication(model)
    ) {
      allInvolvedClazzes.add(targetClass);
    } else if (
      containedClazzesArray.findBy('id', targetClass.id) &&
      !isDrawableClassCommunication(model)
    ) {
      allInvolvedClazzes.add(sourceClass);
      // Hide communication which is not directly connected to highlighted entity
    } else if (
      !containedClazzesArray.findBy('id', sourceClass.id) && 
      !containedClazzesArray.findBy('id', targetClass.id) &&
      !isDrawableClassCommunication(model)
    ) {

      for(let link of allLinks){
        if(link.getModelId() === id){
            link.turnTransparent(opacity);
            break;
        }
      }
      // communication is not equal to the highlighted one, i.e. model
    } else if (
      isDrawableClassCommunication(model) &&
      model !== comm
    ) {
      for(let link of allLinks){
        if(link.getModelId() === id)
          link.turnTransparent(opacity);
        break;
      }
    }
  });

  const allInvolvedClazzesArray = Array.from(allInvolvedClazzes);



  const nonInvolvedClazzes = new Set(
    [...allClazzes].filter((x) => !allInvolvedClazzesArray.findBy('id', x.id))
  );

  const componentSet = new Set<Package>();

  allInvolvedClazzes.forEach((clazz) => {
    applicationObject3DList.forEach(applicationObject3d => {
      if(applicationHasClass(applicationObject3d.data.application, clazz)){

        getClassAncestorPackages(clazz).forEach((pckg) => {
          componentSet.add(pckg);

          // in case a component or clazz was transparent before:
          applicationObject3d.getBoxMeshbyModelId(clazz.id)?.turnOpaque();
          turnComponentAndAncestorsOpaque(
            pckg,
            applicationObject3d,
            new Set(),
          );
        });
      }
    });
  });

  



  // Turn non involved clazzes transparent/opaque in highlightMode/unhighlightMode
  nonInvolvedClazzes.forEach((clazz) => {
    let clazzMesh, componentMesh;
    for(let application of applicationObject3DList){
      clazzMesh = application.getBoxMeshbyModelId(clazz.id);
      componentMesh = application.getBoxMeshbyModelId(
        clazz.parent.id
      );

      if (
        clazzMesh instanceof ClazzMesh &&
        componentMesh instanceof ComponentMesh
      ) {
        if(componentMesh.opened){ 
          clazzMesh.turnTransparent(opacity);
        }

        turnComponentAndAncestorsTransparent(
            clazz.parent,
            application,
            componentSet,
            opacity
          );
        break;
      }
    }
    
    
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
  applicationObject3DList: ApplicationObject3D[],
  communication: DrawableClassCommunication[],
  allLinks: ClazzCommunicationMesh[],
  opacity: number
) {
  const mesh = applicationObject3D.getBoxMeshbyModelId(entity.id);
  if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh) {
    highlight(mesh, applicationObject3D,applicationObject3DList,communication,allLinks,opacity);
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
  removeAllHighlighting(applicationObject3D);

  applicationObject3D.highlightedEntity = trace;

  const drawableComms = communication;

  // All clazzes in application
  const allClazzesAsArray = getAllClassesInApplication(
    applicationObject3D.data.application
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
    [...allClazzes].filter((x) => !involvedClazzesArray.findBy('id', x.id))
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
  applicationObject3DList: ApplicationObject3D[],
  communication: DrawableClassCommunication[],
  allLinks: ClazzCommunicationMesh[],
  opacity: number
) {
  let allHighlightiedEntity = new Set<BaseMesh>();
  applicationObject3DList.forEach(app =>{
    if(app.highlightedEntity && !(isTrace(app.highlightedEntity)))
    app.highlightedEntity.forEach(element => {
      allHighlightiedEntity.add(element);
    });
  })


  if (allHighlightiedEntity.size == 0) {
    return;
  }else {
    allHighlightiedEntity.forEach(mesh => {

      // Re-run highlighting for entity
      if (
        mesh instanceof ClazzMesh ||
        mesh instanceof ComponentMesh ||
        mesh instanceof ClazzCommunicationMesh
      ) {
        highlight(
          mesh,
          applicationObject3D,
          applicationObject3DList,
          communication,
          allLinks,
          opacity,
          false
        );
      }
    });
  }
}
