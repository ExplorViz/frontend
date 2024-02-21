import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaboration/services/local-user';
import WebSocketService from 'collaboration/services/web-socket';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import { SerializedPopup } from 'collaboration/utils/web-socket-messages/types/serialized-room';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import GrabbableForceGraph from 'explorviz-frontend/view-objects/3d/landscape/grabbable-force-graph';
import * as THREE from 'three';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import {
  getTypeOfEntity,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import { MenuDetachedForwardMessage } from 'extended-reality/utils/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  MenuDetachedResponse,
  isMenuDetachedResponse,
} from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/menu-detached';
import {
  ObjectClosedResponse,
  isObjectClosedResponse,
} from 'extended-reality/utils/vr-web-wocket-messages/receivable/response/object-closed';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import {
  MENU_DETACHED_EVENT,
  MenuDetachedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';

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
    this.detachedMenuRenderer.on('restore_popups', this, this.onRestorePopups);
  }

  @action
  clearPopups() {
    this.popupData = [];
  }

  @action
  removeUnpinnedPopups() {
    this.popupData = this.popupData.filter((data) => data.isPinned);
  }

  @action
  removeUnmovedPopups() {
    this.popupData = this.popupData.filter((data) => data.wasMoved);
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
        event: MENU_DETACHED_EVENT,
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
    if (!popup) {
      return;
    }

    if (!popup.menuId) {
      this.popupData = this.popupData.filter((pd) => pd.entity.id !== entityId);
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
    wasMoved,
    pinned,
    replace,
    menuId,
    sharedBy,
    hovered,
  }: {
    mesh: THREE.Object3D;
    position?: Position2D;
    wasMoved?: boolean;
    pinned?: boolean;
    replace?: boolean;
    menuId?: string | null;
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
      wasMoved: wasMoved || false,
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
      wasMoved: true,
      pinned: true,
      sharedBy: userId,
      menuId: objectId,
    });
  }

  onRestorePopups(popups: SerializedPopup[]) {
    this.popupData = [];
    for (const popup of popups) {
      const { entityId } = popup;

      const mesh = this.applicationRenderer.getMeshById(entityId);

      if (mesh) {
        this.addPopup({
          mesh,
          wasMoved: true,
          pinned: true,
          sharedBy: popup.userId || undefined,
          menuId: popup.menuId,
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
    this.detachedMenuRenderer.off('restore_popups', this, this.onRestorePopups);
  }
}
