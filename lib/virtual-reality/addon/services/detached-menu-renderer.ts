import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Evented from '@ember/object/evented';
import { isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import DetachedMenuGroupsService from './detached-menu-groups';
import VrMenuFactoryService from './vr-menu-factory';
import LocalUser from 'collaborative-mode/services/local-user';
import { SerializedDetachedMenu } from 'collaborative-mode/utils/web-socket-messages/types/serialized-room';
import { SPECTATE_VIEW_ENTITY_TYPE } from 'collaborative-mode/utils/web-socket-messages/types/entity-type';

export default class DetachedMenuRenderer extends Service.extend(Evented) {
  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('local-user')
  localUser!: LocalUser;

  restore(detachedMenus: SerializedDetachedMenu[]) {
    if (this.localUser.visualizationMode === 'browser') {
      this.trigger('restore_popups', detachedMenus);
    } else if (this.localUser.visualizationMode === 'vr') {
      detachedMenus.forEach((detachedMenu) => {
        this.restoreDetachedMenu(detachedMenu);
      });
    }
  }

  restoreDetachedMenu(detachedMenu: SerializedDetachedMenu) {
    if (!(detachedMenu.entityType === SPECTATE_VIEW_ENTITY_TYPE)) {
      const object = this.applicationRenderer.getMeshById(
        detachedMenu.entityId
      );

      if (isEntityMesh(object)) {
        const menu = this.menuFactory.buildInfoMenu(object);
        menu.position.fromArray(detachedMenu.position);
        menu.quaternion.fromArray(detachedMenu.quaternion);
        menu.scale.fromArray(detachedMenu.scale);
        this.detachedMenuGroups.addDetachedMenuLocally(
          menu,
          detachedMenu.objectId,
          detachedMenu.userId
        );
      }
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'detached-menu-renderer': DetachedMenuRenderer;
  }
}
