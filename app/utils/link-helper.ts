import { GraphLink } from "explorviz-frontend/components/visualization/rendering/browser-rendering";
import ApplicationObject3D from "explorviz-frontend/view-objects/3d/application/application-object-3d";
import ComponentMesh from "explorviz-frontend/view-objects/3d/application/component-mesh";
import { Object3D } from "three";
import { DrawableClassCommunication } from "./application-rendering/class-communication-computer";
import { Class, Package } from "./landscape-schemes/structure-data";

type Coords = { x: number; y: number; z: number; }

export function linkPositionUpdate(line: Object3D, _coords: { start: Coords, end: Coords }, link: GraphLink) {
  const drawableClassCommunication: DrawableClassCommunication = link.communicationData;

  // source
  const sourceApp = link.source.__threeObj;
  const sourceClass = findFirstOpen(sourceApp, drawableClassCommunication.sourceClass);
  // const sourceMesh = sourceApp.getBoxMeshbyModelId(drawableClassCommunication.sourceClass.id); // non-recursive alternative that does not consider open/ closed components
  const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
  const start = sourceMesh.position.clone();
  sourceApp.localToWorld(start);
  line.position.x = start.x;
  line.position.y = start.y;
  line.position.z = start.z;

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

  // distance
  const distance = start.distanceTo(end);
  line.scale.z = distance;
  line.lookAt(end);

  return true;
}

function findFirstOpen(app: ApplicationObject3D, clazz: Class) {
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
function findFirstOpenOrLastClosedAncestorComponent(app: ApplicationObject3D, component: Package): Package {
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
