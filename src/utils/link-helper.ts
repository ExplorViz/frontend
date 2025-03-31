import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

/* eslint-disable no-underscore-dangle */

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
  const parentMesh = app.getBoxMeshByModelId(parentComponent.id);
  if (parentMesh instanceof ComponentMesh && parentMesh.opened) {
    return component;
  }

  // Recursive call
  return findFirstOpenOrLastClosedAncestorComponent(app, parentComponent);
}

export function findFirstOpen(
  app: ApplicationObject3D,
  entity: Class | Package
) {
  const sourceParent = entity.parent;
  const sourceParentMesh = app.getBoxMeshByModelId(sourceParent.id);
  // Determine where the communication should begin
  // (clazz or component - based upon their visiblity)
  if (sourceParentMesh instanceof ComponentMesh && sourceParentMesh.opened) {
    return entity;
  }
  return findFirstOpenOrLastClosedAncestorComponent(app, sourceParent);
}
