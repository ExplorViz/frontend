import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getAllClassIdsInApplication,
  getAllPackageIdsInApplications,
} from 'explorviz-frontend/src/utils/application-helpers';
import {
  Application,
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

const {
  closeComponents,
  hideClasses,
  hideComponents,
  openComponents,
  showClasses,
  showComponents,
} = useVisualizationStore.getState().actions;

/**
 * Given a package or class, returns a list of all ancestor components.
 *
 * @param entity Package or class of which the ancestors shall be returned (entity is not included in the list)
 */
export function getAllAncestorComponents(entity: Package | Class): Package[] {
  if (entity.parent === undefined) {
    return [];
  }

  return [entity.parent, ...getAllAncestorComponents(entity.parent)];
}

/**
 * Opens all components which are given in a list.
 *
 * @param components List of components which shall be opened
 */
export function openComponentsByList(
  components: Package[],
  sendMessage = true
) {
  const componentIds = components.map((component) => component.id);
  openComponents(componentIds);

  const containedClassIds: string[] = [];
  components.forEach((component) => {
    containedClassIds.push(
      ...component.classes.map((classModel) => classModel.id)
    );
  });
  showClasses(containedClassIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate(componentIds, true);
  }
}

/**
 * Opens the component and its ancestors
 *
 * @param components List of components which shall be opened
 */
export function openComponentAndAncestor(
  component: Package | Class,
  sendMessage = true
) {
  const ancestors = getAllAncestorComponents(component);
  const componentIds = ancestors.map(
    (ancestorComponent) => ancestorComponent.id
  );
  openComponents(componentIds);

  const containedClassIds: string[] = [];
  ancestors.forEach((component) => {
    containedClassIds.push(
      ...component.classes.map((classModel) => classModel.id)
    );
  });
  showClasses(containedClassIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate(componentIds, true);
  }
}

/**
 * Opens a given component.
 *
 * @param component Component which shall be opened
 */
export function openComponent(componentId: string, sendMessage = true) {
  const component = useModelStore.getState().getComponent(componentId);
  if (!component) return;

  const isOpen = !useVisualizationStore
    .getState()
    .closedComponentIds.has(component.id);
  if (isOpen) {
    return;
  }

  openComponents([component.id]);
  showComponents(component.subPackages.map((pckg) => pckg.id));
  showClasses(component.classes.map((classModel) => classModel.id));

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate([component.id], true);
  }
}

/**
 * Closes a given component.
 *
 * @param component Component which shall be closed
 */
export function closeComponent(
  componentId: string,
  hide = false,
  sendMessage = true
) {
  const component = useModelStore.getState().getComponent(componentId);

  if (!component) return;

  const isOpen = !useVisualizationStore
    .getState()
    .closedComponentIds.has(component.id);
  if (hide) {
    hideComponents([component.id]);
  }

  if (!isOpen) {
    return;
  }

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate([component.id], false);
  }

  closeComponents([component.id]);

  hideClasses(component.classes.map((classModel) => classModel.id));

  const childComponents = component.subPackages;
  childComponents.forEach((childComponent) => {
    closeComponent(childComponent.id, true, false);
  });
}

/**
 * Closes all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function closeAllComponentsInApplication(
  application: Application,
  sendMessage = true
) {
  const packageIds = getAllPackageIdsInApplications(application);
  const topLevelPackageIds = application.packages.map((pkg) => pkg.id);
  const packageIdsToHide = packageIds.filter(
    (id) => !topLevelPackageIds.includes(id)
  );
  closeComponents(packageIds);
  hideComponents(packageIdsToHide);
  hideClasses(getAllClassIdsInApplication(application));

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate(packageIds, false);
  }
}

export function closeAllComponentsInLandscape(sendMessage = true) {
  const topLevelComponentIds = useModelStore
    .getState()
    .getAllComponents()
    .filter((component) => component.parent === undefined)
    .map((component) => component.id);
  const allPackageIds = useModelStore
    .getState()
    .getAllComponents()
    .map((component) => component.id);
  const allClassIds = useModelStore
    .getState()
    .getAllClasses()
    .map((classModel) => classModel.id);

  closeComponents(allPackageIds);
  hideComponents(
    Array.from(new Set(allPackageIds).difference(new Set(topLevelComponentIds)))
  );
  hideClasses(allClassIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate(allPackageIds, false);
  }
}

/**
 * Opens all components which are part of the given application
 *
 * @param application Application object which contains the components
 */
export function openAllComponentsInApplication(
  application: Application,
  sendMessage = true
) {
  openComponents(getAllPackageIdsInApplications(application));
  showClasses(getAllClassIdsInApplication(application));

  if (sendMessage) {
    useMessageSenderStore
      .getState()
      .sendComponentUpdate(getAllPackageIdsInApplications(application), true);
  }
}

export function openAllComponentsInLandscape(sendMessage = true) {
  const packageIds = useModelStore
    .getState()
    .getAllComponents()
    .map((component) => component.id);
  const classIds = useModelStore
    .getState()
    .getAllClasses()
    .map((classModel) => classModel.id);

  openComponents(packageIds);
  showComponents(packageIds);
  showClasses(classIds);

  if (sendMessage) {
    useMessageSenderStore.getState().sendComponentUpdate(packageIds, true);
  }
}
