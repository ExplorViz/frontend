import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationObject3D from 'some-react-lib/src/view-objects/3d/application/application-object-3d';
import GrabbableForceGraph from 'some-react-lib/src/view-objects/3d/landscape/grabbable-force-graph';
import * as THREE from 'three';
import DetachedMenuRenderer from 'virtual-reality/services/detached-menu-renderer';
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
import { SerializedDetachedMenu } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';

export default class PopupHandler {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

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
    this.detachedMenuRenderer.on('restore_popups', this, this.onRestoreMenus);
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
  removeUnmovedPopups() {
    this.popupData = this.popupData.filterBy('wasMoved', true);
  }

  @action
  sharePopup(popup: PopupData) {
    this.updateMeshReference(popup);

    const { mesh } = popup;
    const entityId = mesh.getModelId();
    const worldPosition = this.applicationRenderer.getGraphPosition(mesh);
    worldPosition.y += 0.3;

    this.webSocket.sendRespondableMessage<
      MenuDetachedMessage,
      MenuDetachedResponse
    >(
      MENU_DETACHED_EVENT,
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
        onOffline: () => {
          // not used atm
        },
      }
    );
  }

  @action
  pinPopup(popup: PopupData) {
    this.pinPopupLocally(popup.mesh.getModelId());
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
        DETACHED_MENU_CLOSED_EVENT,
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
        pd.hovered = pd.entity.id === mesh.getModelId();
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
    position?: Position2D;
    pinned?: boolean;
    replace?: boolean;
    menuId?: string;
    sharedBy?: string;
    hovered?: boolean;
  }) {
    if (!isEntityMesh(mesh)) {
      return;
    }

    let popupPosition = position;

    // Popups shared by other users have no position information
    if (!popupPosition) {
      popupPosition = {
        x: 100,
        y: 200 + this.popupData.length * 50,
      };
    }

    const newPopup = new PopupData({
      mouseX: popupPosition.x,
      mouseY: popupPosition.y,
      wasMoved: false,
      entity: mesh.dataModel,
      mesh,
      applicationId: (
        mesh.parent as ApplicationObject3D | GrabbableForceGraph
      ).getModelId(),
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
        return;
      }

      const unpinnedPopupIndex = this.popupData.findIndex((pd) => !pd.isPinned);

      if (unpinnedPopupIndex === -1) {
        this.popupData = [...this.popupData, newPopup];
      } else {
        const unpinnedPopup = this.popupData[unpinnedPopupIndex];
        // Replace unpinned popup
        this.popupData[unpinnedPopupIndex] = newPopup;
        this.popupData = [...this.popupData];

        // Place new popup at same position of previously moved popup
        if (unpinnedPopup.wasMoved) {
          newPopup.mouseX = unpinnedPopup.mouseX;
          newPopup.mouseY = unpinnedPopup.mouseY;
          newPopup.wasMoved = true;
        }
      }
    }
  }

  onMenuDetached({ objectId, userId, detachId }: MenuDetachedForwardMessage) {
    const mesh = this.applicationRenderer.getMeshById(detachId);
    if (!mesh) {
      return;
    }

    this.addPopup({
      mesh,
      pinned: true,
      sharedBy: userId,
      menuId: objectId,
    });
  }

  onRestoreMenus(detachedMenus: SerializedDetachedMenu[]) {
    for (const detachedMenu of detachedMenus) {
      const { userId, objectId, entityId } = detachedMenu;

      if (!userId || !objectId) {
        continue;
      }

      const mesh = this.applicationRenderer.getMeshById(entityId);

      if (mesh) {
        this.addPopup({
          mesh,
          pinned: true,
          sharedBy: userId,
          menuId: objectId,
        });
      }
    }
  }

  @action
  onMenuClosed({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void {
    this.popupData = this.popupData.filter((pd) => pd.menuId !== menuId);
  }

  /**
   * Updates mesh reference of popup with given ID in popup data.
   */
  @action
  updateMeshReference(popup: PopupData) {
    const mesh = this.applicationRenderer.getMeshById(popup.entity.id);
    if (isEntityMesh(mesh)) {
      popup.mesh = mesh;
    }
  }

  willDestroy() {
    this.webSocket.off(MENU_DETACHED_EVENT, this, this.onMenuDetached);
    this.webSocket.off(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
  }
}
