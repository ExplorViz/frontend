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
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import GrabbableForceGraph from 'explorviz-frontend/view-objects/3d/landscape/grabbable-force-graph';
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
import * as THREE from 'three';

export default class PopupHandler {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('local-user')
  private localUser!: LocalUser;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('web-socket')
  private webSocket!: WebSocketService;

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
          // Not used at the moment
        },
      }
    );
  }

  @action
  pinPopup(popup: PopupData) {
    popup.isPinned = true;
  }

  @action
  async removePopup(entityId: string) {
    const popup = this.popupData.find((pd) => pd.entity.id === entityId);
    if (!popup) {
      return;
    }

    if (await this.canRemovePopup(popup)) {
      this.popupData = this.popupData.filter((pd) => pd.entity.id !== entityId);
    } else {
      this.toastHandlerService.showErrorToastMessage(
        'Could not remove popup since it is currently in use by another user.'
      );
    }
  }

  private async canRemovePopup(popup: PopupData) {
    // Popup / menu cannot be grabbed by other user without menuId
    if (!popup.menuId) {
      return true;
    }

    return this.webSocket.sendRespondableMessage<
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
          return response.isSuccess;
        },
        onOffline: () => {
          return true;
        },
      }
    );
  }

  @action
  handleHoverOnMesh(mesh?: THREE.Object3D) {
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
        y: 200 + this.popupData.length * 50, // Stack popups vertically
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

    // Replace all existing popups with new popup
    if (replace) {
      this.popupData = [newPopup];
      return;
    }

    // Check if popup for entity already exists and update it if so
    const maybePopup = this.popupData.find(
      (pd) => pd.entity.id === newPopup.entity.id
    );
    if (maybePopup) {
      this.updateExistingPopup(maybePopup, newPopup);
      return;
    }

    // Ensure that there is at most one unpinned popup
    const unpinnedPopupIndex = this.popupData.findIndex((pd) => !pd.isPinned);

    if (unpinnedPopupIndex === -1 || newPopup.isPinned) {
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

  private updateExistingPopup(popup: PopupData, newPopup: PopupData) {
    popup.wasMoved = newPopup.wasMoved;
    popup.isPinned = newPopup.isPinned;
    popup.sharedBy = newPopup.sharedBy;
    this.updateMeshReference(popup);
  }

  /**
   *
   * React on detached menu (popup in VR) update and show a regular HTML popup.
   */
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
      const mesh = this.applicationRenderer.getMeshById(popup.entityId);
      if (!mesh) {
        continue;
      }

      this.addPopup({
        mesh,
        wasMoved: true,
        pinned: true,
        sharedBy: popup.userId || undefined,
        menuId: popup.menuId,
      });
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
