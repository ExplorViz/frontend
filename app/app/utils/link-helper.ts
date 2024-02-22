import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'some-react-lib/src/view-objects/3d/application/component-mesh';
import {
  Class,
  Package,
} from 'some-react-lib/src/utils/landscape-schemes/structure-data';

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
