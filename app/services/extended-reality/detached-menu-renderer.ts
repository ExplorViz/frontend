import Service, { inject as service } from '@ember/service';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Evented from '@ember/object/evented';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'explorviz-frontend/utils/extended-reality/vr-helpers/detail-info-composer';
import DetachedMenuGroupsService from 'explorviz-frontend/services/extended-reality/detached-menu-groups';
import VrMenuFactoryService from 'explorviz-frontend/services/extended-reality/vr-menu-factory';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import {
  SerializedAnnotation,
  SerializedDetachedMenu,
  SerializedPopup,
} from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/serialized-room';
import { SPECTATE_VIEW_ENTITY_TYPE } from 'explorviz-frontend/utils/collaboration/web-socket-messages/types/entity-type';

export default class DetachedMenuRenderer extends Service.extend(Evented) {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('extended-reality/detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('extended-reality/vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  restore(popups: SerializedPopup[], detachedMenus: SerializedDetachedMenu[]) {
    if (this.localUser.visualizationMode === 'browser') {
      const popupsFromMenu: SerializedPopup[] = detachedMenus.map(
        (detachedMenu) => {
          return {
            userId: detachedMenu.userId,
            entityId: detachedMenu.entityId,
            menuId: detachedMenu.objectId,
          };
        }
      );
      this.trigger('restore_popups', popups.concat(popupsFromMenu));
    }

    if (this.localUser.visualizationMode === 'vr') {
      popups.forEach((popup) => {
        this.restoreFromPopup(popup);
      });
      detachedMenus.forEach((detachedMenu) => {
        this.restoreDetachedMenu(detachedMenu);
      });
    }
  }

  restoreAnnotations(annotations: SerializedAnnotation[]) {
    for (const an of annotations) {
      an.menuId = an.objectId;
    }
    this.trigger('restore_annotations', annotations);
  }

  restoreDetachedMenus(detachedMenus: SerializedDetachedMenu[]) {
    detachedMenus.forEach((detachedMenu) => {
      this.restoreDetachedMenu(detachedMenu);
    });
  }

  restoreDetachedMenu(detachedMenu: SerializedDetachedMenu) {
    if (detachedMenu.entityType === SPECTATE_VIEW_ENTITY_TYPE) {
      return;
    }
    const object = this.applicationRenderer.getMeshById(detachedMenu.entityId);

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

  restoreFromPopups(popupData: SerializedPopup[]) {
    popupData.forEach((popup) => {
      this.restoreFromPopup(popup);
    });
  }

  restoreFromPopup(popupData: SerializedPopup) {
    const mesh = this.applicationRenderer.getMeshById(popupData.entityId);
    if (!isEntityMesh(mesh)) {
      return;
    }
    const worldPosition = this.applicationRenderer.getPositionInLandscape(mesh);
    worldPosition.y += 0.3;

    this.restoreDetachedMenu({
      objectId: popupData.entityId,
      userId: null,
      entityId: popupData.entityId,
      entityType: getTypeOfEntity(mesh),
      position: worldPosition.toArray(),
      quaternion: [0, 0, 0, 0],
      scale: [1, 1, 1],
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'extended-reality/detached-menu-renderer': DetachedMenuRenderer;
  }
}
