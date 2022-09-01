import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { SerializedDetachedMenu } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import DetachedMenuGroupsService from './detached-menu-groups';
import VrMenuFactoryService from './vr-menu-factory';

export default class DetachedMenuRenderer extends Service.extend({
}) {
  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  restore(detachedMenus: SerializedDetachedMenu[]) {
    // Initialize detached menus.
    detachedMenus.forEach((detachedMenu) => {
      this.restoreMenu(detachedMenu);
    });
  }

  restoreMenu(detachedMenu: SerializedDetachedMenu) {
    const object = this.applicationRenderer.getMeshById(detachedMenu.entityId);
    if (isEntityMesh(object)) {
      const menu = this.menuFactory.buildInfoMenu(object);
      menu.position.fromArray(detachedMenu.position);
      menu.quaternion.fromArray(detachedMenu.quaternion);
      menu.scale.fromArray(detachedMenu.scale);
      this.detachedMenuGroups.addDetachedMenuLocally(
        menu,
        detachedMenu.objectId,
        detachedMenu.userId,
      );
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'detached-menu-renderer': DetachedMenuRenderer;
  }
}
