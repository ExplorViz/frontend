import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import * as THREE from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { MenuDetachedForwardMessage } from 'virtual-reality/utils/vr-message/receivable/menu-detached-forward';
import {
  isMenuDetachedResponse,
  MenuDetachedResponse,
} from 'virtual-reality/utils/vr-message/receivable/response/menu-detached';
import {
  isObjectClosedResponse,
  ObjectClosedResponse,
} from 'virtual-reality/utils/vr-message/receivable/response/object-closed';
import {
  DetachedMenuClosedMessage,
  DETACHED_MENU_CLOSED_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/request/detached_menu_closed';
import {
  MenuDetachedMessage,
  MENU_DETACHED_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/request/menu_detached';

export default class PopupHandler {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('local-user')
  private localUser!: LocalUser;

  @tracked
  popupData: PopupData[] = [];

  constructor(owner: any) {
    setOwner(this, owner);
    this.webSocket.on(MENU_DETACHED_EVENT, this, this.onMenuDetached);
    this.webSocket.on(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
  }

  @action
  clearPopups() {
    this.popupData = [];
  }

  @action
  removeUnpinnedPopups() {
    this.popupData = this.popupData.filterBy('isPinned', true);
  }

  @action
  sharePopup(popup: PopupData) {
    const { mesh } = popup;
    const entityId = mesh.dataModel.id;
    const worldPosition = this.applicationRenderer.getGraphPosition(mesh);
    worldPosition.y += 0.3;

    this.webSocket.sendRespondableMessage<
      MenuDetachedMessage,
      MenuDetachedResponse
    >(
      {
        event: 'menu_detached',
        detachId: entityId,
        entityType: getTypeOfEntity(mesh),
        position: worldPosition.toArray(),
        quaternion: [0, 0, 0, 0],
        scale: [1, 1, 1],
        nonce: 0, // will be overwritten
      },
      {
        responseType: isMenuDetachedResponse,
        onResponse: (response: MenuDetachedResponse) => {
          popup.sharedBy = this.localUser.userId;
          popup.isPinned = true;
          popup.menuId = response.objectId;
          return true;
        },
        onOffline: () => {},
      }
    );
  }

  @action
  pinPopup(popup: PopupData) {
    this.pinPopupLocally(popup.mesh.dataModel.id);
  }

  @action
  pinPopupLocally(entityId: string) {
    this.popupData.forEach((popup) => {
      if (popup.entity.id === entityId) {
        popup.isPinned = true;
      }
    });
    this.popupData = [...this.popupData];
  }

  @action
  removePopup(entityId: string) {
    const popup = this.popupData.find((pd) => pd.entity.id === entityId);
    if (popup) {
      if (!popup.menuId) {
        this.popupData = this.popupData.filter(
          (pd) => pd.entity.id !== entityId
        );
        return;
      }
      this.webSocket.sendRespondableMessage<
        DetachedMenuClosedMessage,
        ObjectClosedResponse
      >(
        {
          event: 'detached_menu_closed',
          menuId: popup.menuId,
          nonce: 0, // will be overwritten
        },
        {
          responseType: isObjectClosedResponse,
          onResponse: (response: ObjectClosedResponse) => {
            if (response.isSuccess) {
              this.popupData = this.popupData.filter(
                (pd) => pd.entity.id !== entityId
              );
            }
            return response.isSuccess;
          },
          onOffline: () => {
            this.popupData = this.popupData.filter(
              (pd) => pd.entity.id !== entityId
            );
          },
        }
      );
    }
  }

  @action
  hover(mesh?: THREE.Object3D) {
    if (isEntityMesh(mesh)) {
      this.popupData.forEach((pd) => {
        pd.hovered = pd.entity.id === mesh.dataModel.id;
      });
    } else {
      this.popupData.forEach((pd) => {
        pd.hovered = false;
      });
    }
  }

  @action
  addPopup({
    mesh,
    position,
    pinned,
    replace,
    menuId,
    sharedBy,
    hovered,
  }: {
    mesh: THREE.Object3D;
    position: Position2D;
    pinned?: boolean;
    replace?: boolean;
    menuId?: string;
    sharedBy?: string;
    hovered?: boolean;
  }) {
    if (isEntityMesh(mesh)) {
      const newPopup = new PopupData({
        mouseX: position.x,
        mouseY: position.y,
        entity: mesh.dataModel,
        mesh,
        applicationId: mesh.parent?.dataModel?.id,
        menuId: menuId || null,
        isPinned: pinned || false,
        sharedBy: sharedBy || '',
        hovered: hovered || false,
      });

      if (replace) {
        this.popupData = [newPopup];
      } else {
        const popupAlreadyExists = this.popupData.find(
          (pd) => pd.entity.id === newPopup.entity.id
        );
        if (popupAlreadyExists) {
          // this.pinPopupLocally(newPopup.entity.id, newPopup.menuId);
          return;
        }
        while (
          this.popupData.any(
            (pd) =>
              pd.mouseX === newPopup.mouseX && pd.mouseY === newPopup.mouseY
          )
        ) {
          newPopup.mouseX += 20;
          newPopup.mouseY += 20;
        }

        const notPinnedPopupIndex = this.popupData.findIndex(
          (pd) => !pd.isPinned
        );

        if (notPinnedPopupIndex === -1) {
          this.popupData = [...this.popupData, newPopup];
        } else {
          this.popupData[notPinnedPopupIndex] = newPopup;
          this.popupData = [...this.popupData];
        }
      }
    }
  }

  onMenuDetached({ objectId, userId, detachId }: MenuDetachedForwardMessage) {
    const mesh = this.applicationRenderer.getMeshById(detachId);
    if (mesh) {
      this.addPopup({
        mesh,
        position: { x: 100, y: 200 },
        pinned: true,
        sharedBy: userId,
        menuId: objectId,
      });
    }
  }

  @action
  onMenuClosed({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void {
    this.popupData = this.popupData.filter((pd) => pd.menuId !== menuId);
  }

  willDestroy() {
    this.webSocket.off(MENU_DETACHED_EVENT, this, this.onMenuDetached);
    this.webSocket.off(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
  }
}
