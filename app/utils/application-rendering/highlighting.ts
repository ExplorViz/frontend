import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import {
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
import { getHashCodeToClassMap } from '../landscape-structure-helpers';
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
 * Highlights a given mesh
 *
 * @param mesh Either component, clazz or clazz communication mesh which shall be highlighted
 * @param applicationObject3D Application mesh which contains the mesh
 * @param toggleHighlighting Determines whether highlighting a already highlighted entity
 *                           causes removal of all highlighting
 */
export function highlight(
  meshId: string ,
  applicationObject3D: ApplicationObject3D,
) {

    const mesh = applicationObject3D.getMeshById(meshId) as ComponentMesh | ClazzMesh | ClazzCommunicationMesh | FoundationMesh;
    if(!mesh){
      return;
    }  

    const datamodel  =
    mesh.dataModel instanceof ClazzCommuMeshDataModel
      ? mesh.dataModel.drawableClassCommus.firstObject
      : mesh.dataModel;

    if (!datamodel) {
     return;
    }
  
    if(mesh.highlighted){
      //TODO: Strg + Mausklick Logik => alles unhighlighten wenn auf eine highlighted sache geklickt wird
        mesh.unhighlight(); 
        if(applicationObject3D.highlightedEntity && !isTrace(applicationObject3D.highlightedEntity)){
          applicationObject3D.highlightedEntity.delete(meshId);
        }
    }else{
      mesh.highlight(); //TODO: Strg + Mausklick Logik => nur eine Sache highlightable innerhalb einer Application
  
      if(!applicationObject3D.highlightedEntity || isTrace(applicationObject3D.highlightedEntity)){
          applicationObject3D.highlightedEntity = new Set<string>();
      }
        applicationObject3D.highlightedEntity.add(meshId); 
    }
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
) {
 highlight(entity.id, applicationObject3D);
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
  applicationObject3DList: ApplicationObject3D[],
  communication: DrawableClassCommunication[],
  allLinks: ClazzCommunicationMesh[],
  opacity: number,
) 
{

    // All clazzes from all applications
    let allClazzesArray: Class[] = []; 
    applicationObject3DList.forEach(application => {
      const allClazzesAsArray = getAllClassesInApplication(application.data.application);
      allClazzesAsArray.forEach( clazz => { // set everything transparent at the beginning
        const clazzMesh = application.getBoxMeshbyModelId(clazz.id);
        if(clazzMesh instanceof ClazzMesh){
          clazzMesh.turnTransparent();
        }
        turnComponentAndAncestorsTransparent(clazz.parent, application, new Set(), opacity);
      });
      allClazzesArray = [...allClazzesArray, ...allClazzesAsArray];
    });

    const allClazzes = new Set<Class>(allClazzesArray);

    allLinks.forEach(link => link.turnTransparent()); // make all links transparent
    


    // Now we proceed to compute all involved clazzes in highlighted components


    let allInvolvedClazzesFinal : Set<Class> = new Set();

    applicationObject3DList.forEach((application : ApplicationObject3D) => {

      const highlightedEntityIds = application.highlightedEntity;
      if(highlightedEntityIds && !isTrace(highlightedEntityIds)){
        highlightedEntityIds.forEach((entityId : string) => {

          const baseMesh = application.getMeshById(entityId);
          if(baseMesh){ 

            // Get all clazzes in selected component
            let containedClazzes = new Set<Class>();

            const model = (baseMesh as FoundationMesh | ComponentMesh | ClazzMesh | ClazzCommunicationMesh).dataModel;
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
              });
            }

            const containedClazzesArray = Array.from(containedClazzes);
            const allInvolvedClazzes = new Set(containedClazzes); // does it work like this?

            communication.forEach((comm) => {

              const { sourceClass, targetClass, id } = comm;
          
              // Add clazzes which communicate directly with highlighted entity
              // For a highlighted communication all involved clazzes are already known
              if (
                containedClazzesArray.findBy('id', sourceClass.id) &&
                !isDrawableClassCommunication(model)
              ) 
              {
                allInvolvedClazzes.add(targetClass);

                for(let link of allLinks){ // TODO: helper function so we do not have to write this loop every time in the following
                  if(link.getModelId() === id){
                      link.turnOpaque();
                      break;
                  }
                }

              } else if (
                containedClazzesArray.findBy('id', targetClass.id) &&
                !isDrawableClassCommunication(model)
              ) {
                allInvolvedClazzes.add(sourceClass);
                for(let link of allLinks){ // TODO: helper function so we do not have to write this loop every time in the following
                  if(link.getModelId() === id){
                      link.turnOpaque();
                      break;
                  }
                }
                // Hide communication which is not directly connected to highlighted entity
              } else if (
                !containedClazzesArray.findBy('id', sourceClass.id) && 
                !containedClazzesArray.findBy('id', targetClass.id) &&
                !isDrawableClassCommunication(model)
              ) { // do nothing since all communication lines were set transparent at the beginning 
                  ;
                // communication is not equal to the highlighted one, i.e. model
              } else if (
                isDrawableClassCommunication(model) &&
                model !== comm
              ) { // do nothing since all communication lines were set transparent at the beginning 
                  ;
              }
            });

            allInvolvedClazzes.forEach(clss => allInvolvedClazzesFinal.add(clss));
          }
        });
      }
    });

    if(allInvolvedClazzesFinal.size === 0){
      // set everything opaque

      allLinks.forEach(link => link.turnOpaque()); // make all links transparent
      allInvolvedClazzesFinal = allClazzes; // we pretend that all clazzes are "selected" so everything gets opaque again
    }


     
    const allInvolvedClazzesArray = Array.from(allInvolvedClazzesFinal);

    // Turn involved clazzes opaque
    allInvolvedClazzesArray.forEach((clazz) => {
        for(let application of applicationObject3DList){
        if(applicationHasClass(application.data.application, clazz)){
          application.getBoxMeshbyModelId(clazz.id)?.turnOpaque();
          getClassAncestorPackages(clazz).forEach(pckg => {
            application.getBoxMeshbyModelId(pckg.id)?.turnOpaque();
          });
          break;
        }
      }
    });
      
}
  
export function removeHighlighting(
  mesh: ComponentMesh | ClazzMesh | ClazzCommunicationMesh | FoundationMesh,
  applicationObject3D: ApplicationObject3D ){
  highlight(mesh.getModelId(), applicationObject3D);
}





