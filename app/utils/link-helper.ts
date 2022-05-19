import { GraphLink } from "explorviz-frontend/rendering/application/force-graph";
import ApplicationObject3D from "explorviz-frontend/view-objects/3d/application/application-object-3d";
import ClazzCommunicationMesh from "explorviz-frontend/view-objects/3d/application/clazz-communication-mesh";
import ComponentMesh from "explorviz-frontend/view-objects/3d/application/component-mesh";
import CommunicationLayout from "explorviz-frontend/view-objects/layout-models/communication-layout";
import { DrawableClassCommunication } from "./application-rendering/class-communication-computer";
import { Class, Package } from "./landscape-schemes/structure-data";

type Coords = { x: number; y: number; z: number; }

export function linkPositionUpdate(line: ClazzCommunicationMesh, _coords: { start: Coords, end: Coords }, link: GraphLink) {
  if (!link.communicationData) {
    return true;
  }
  const drawableClassCommunication: DrawableClassCommunication = link.communicationData;

  // source
  const sourceApp = link.source.__threeObj;
  const sourceClass = findFirstOpen(sourceApp, drawableClassCommunication.sourceClass);
  // const sourceMesh = sourceApp.getBoxMeshbyModelId(drawableClassCommunication.sourceClass.id); // non-recursive alternative that does not consider open/ closed components
  const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
  const start = sourceMesh.position.clone();
  sourceApp.localToWorld(start);
  // line.position.x = start.x;
  // line.position.y = start.y;
  // line.position.z = start.z;

  // target
  const targetApp = link.target.__threeObj
  const targetClass = findFirstOpen(targetApp, drawableClassCommunication.targetClass);
  // const targetMesh = targetApp.getBoxMeshbyModelId(drawableClassCommunication.targetClass.id); // non-recursive alternative that does not consider open/ closed components
  const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id)!;
  const end = targetMesh.position.clone();
  targetApp.localToWorld(end);

  // workaround to move particles and arrow
  link.__curve.v0.copy(start);
  link.__curve.v1.copy(start);
  link.__curve.v2.copy(end);
  link.__curve.v3?.copy(end);

  // distance
  // const distance = start.distanceTo(end);
  // line.scale.z = distance;
  // line.lookAt(end);

  const commLayout = new CommunicationLayout(drawableClassCommunication);
  commLayout.startPoint = start;
  commLayout.endPoint = end;
  commLayout.lineThickness = 0.2;
  line.layout = commLayout;
  line.geometry.dispose();
  line.render();
  // line.geometry.parameters.


  return true;
}

export function findFirstOpen(app: ApplicationObject3D, clazz: Class) {
  const sourceParent = clazz.parent;
  const sourceParentMesh = app.getBoxMeshbyModelId(sourceParent.id);
  // Determine where the communication should begin
  // (clazz or component - based upon their visiblity)
  if (sourceParentMesh instanceof ComponentMesh && sourceParentMesh.opened) {
    return clazz;
  } else {
    return findFirstOpenOrLastClosedAncestorComponent(app, sourceParent);
  }
}

/**
 * Returns the first parent component which is open
 * or - if it does not exist - the deepest closed component
 *
 * @param component Component for which an open parent shall be returned
 */
export function findFirstOpenOrLastClosedAncestorComponent(app: ApplicationObject3D, component: Package): Package {
  const parentComponent = component.parent;

  if (!parentComponent) return component;

  // Check open status in corresponding component mesh
  const parentMesh = app.getBoxMeshbyModelId(parentComponent.id);
  if (parentMesh instanceof ComponentMesh && parentMesh.opened) {
    return component;
  }

  // Recursive call
  return findFirstOpenOrLastClosedAncestorComponent(app, parentComponent);
}
