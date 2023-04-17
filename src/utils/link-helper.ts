import { GraphLink } from '../rendering/application/force-graph';
import ApplicationObject3D from '../view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from '../view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from '../view-objects/3d/application/component-mesh';
import CommunicationLayout from '../view-objects/layout-models/communication-layout';
import { DrawableClassCommunication } from './application-rendering/class-communication-computer';
import { Class, Package } from './landscape-schemes/structure-data';

/* eslint-disable no-underscore-dangle */

type Coords = { x: number; y: number; z: number };

/**
 * Returns the first parent component which is open
 * or - if it does not exist - the deepest closed component
 *
 * @param component Component for which an open parent shall be returned
 */
export function findFirstOpenOrLastClosedAncestorComponent(
  app: ApplicationObject3D,
  component: Package
): Package {
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

export function findFirstOpen(app: ApplicationObject3D, clazz: Class) {
  const sourceParent = clazz.parent;
  const sourceParentMesh = app.getBoxMeshbyModelId(sourceParent.id);
  // Determine where the communication should begin
  // (clazz or component - based upon their visiblity)
  if (sourceParentMesh instanceof ComponentMesh && sourceParentMesh.opened) {
    return clazz;
  }
  return findFirstOpenOrLastClosedAncestorComponent(app, sourceParent);
}

export function linkPositionUpdate(
  line: ClazzCommunicationMesh,
  _coords: { start: Coords; end: Coords },
  link: GraphLink
) {
  if (!link.communicationData) {
    return true;
  }
  const drawableClassCommunication: DrawableClassCommunication =
    link.communicationData;

  // source
  const sourceApp = link.source.__threeObj;
  const sourceClass = findFirstOpen(
    sourceApp,
    drawableClassCommunication.sourceClass
  );
  const sourceMesh = sourceApp.getBoxMeshbyModelId(sourceClass.id)!;
  const start = sourceMesh.position.clone();
  sourceApp.localToWorld(start);

  // target
  const targetApp = link.target.__threeObj;
  const targetClass = findFirstOpen(
    targetApp,
    drawableClassCommunication.targetClass
  );
  const targetMesh = targetApp.getBoxMeshbyModelId(targetClass.id)!;
  const end = targetMesh.position.clone();
  targetApp.localToWorld(end);

  // workaround to move particles and arrow
  link.__curve.v0.copy(start);
  link.__curve.v1.copy(start);
  link.__curve.v2.copy(end);
  link.__curve.v3?.copy(end);

  const commLayout = new CommunicationLayout(drawableClassCommunication);
  commLayout.startPoint = start;
  commLayout.endPoint = end;
  commLayout.lineThickness = 0.2;
  line.layout = commLayout;
  line.geometry.dispose();
  line.render();

  return true;
}
