import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { Position2D } from "explorviz-frontend/modifiers/interaction-modifier";
import ApplicationRenderer from "explorviz-frontend/services/application-renderer";
import { Application, Class, Node, Package } from "explorviz-frontend/utils/landscape-schemes/structure-data";
import ClazzCommunicationMesh from "explorviz-frontend/view-objects/3d/application/clazz-communication-mesh";
import ClazzMesh from "explorviz-frontend/view-objects/3d/application/clazz-mesh";
import ComponentMesh from "explorviz-frontend/view-objects/3d/application/component-mesh";
import ClazzCommuMeshDataModel from "explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model";
import ApplicationMesh from "explorviz-frontend/view-objects/3d/landscape/application-mesh";
import NodeMesh from "explorviz-frontend/view-objects/3d/landscape/node-mesh";
import THREE from "three";
import VrMessageReceiver from "virtual-reality/services/vr-message-receiver";
import VrMessageSender from "virtual-reality/services/vr-message-sender";
import WebSocketService from "virtual-reality/services/web-socket";
import { ForwardedMessage } from "virtual-reality/utils/vr-message/receivable/forwarded";
import { MenuDetachedForwardMessage } from "virtual-reality/utils/vr-message/receivable/menu-detached-forward";
import { isMenuDetachedResponse, MenuDetachedResponse } from "virtual-reality/utils/vr-message/receivable/response/menu-detached";
import { isObjectClosedResponse, ObjectClosedResponse } from "virtual-reality/utils/vr-message/receivable/response/object-closed";
import { DetachedMenuClosedMessage, DETACHED_MENU_CLOSED_EVENT } from "virtual-reality/utils/vr-message/sendable/request/detached_menu_closed";
import { MenuDetachedMessage, MENU_DETACHED_EVENT } from "virtual-reality/utils/vr-message/sendable/request/menu_detached";
import { COMPONENT_ENTITY_TYPE } from "virtual-reality/utils/vr-message/util/entity_type";

type PopupData = {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
    applicationId: string,
    isPinned: boolean,
    menuId: string | null,
};

export default class PopupHandler {

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer;

    @service('web-socket')
    private webSocket!: WebSocketService;

    @service('vr-message-sender')
    private sender!: VrMessageSender;

    @service('vr-message-receiver')
    private receiver!: VrMessageReceiver;

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
    removeAllPopups() {
        this.popupData = [];
    }

    @action
    pinPopup(entityId: string) {
        const mesh = this.applicationRenderer.getMeshById(entityId);
        if (mesh) {
            const worldPosition = new THREE.Vector3()
            mesh.getWorldPosition(worldPosition)
            worldPosition.y += 0.3;
            // this.sendPopupOpened(popup.applicationId, popup.entity.id, [0, 0, 0]);
            const nonce = this.sender.nextNonce(); // this.sender.sendMenuDetached()
            this.webSocket.send<MenuDetachedMessage>({
                event: 'menu_detached',
                nonce,
                detachId: entityId,
                entityType: COMPONENT_ENTITY_TYPE,
                position: worldPosition.toArray(),
                quaternion: [0, 0, 0, 0],
                scale: [1, 1, 1],
            });
            // Wait for backend to assign an id to the detached menu.
            this.receiver.awaitResponse({
                nonce,
                responseType: isMenuDetachedResponse,
                onResponse: (response: MenuDetachedResponse) => {
                    this.pinPopupLocally(entityId, response.objectId);
                },
                onOffline: () => {
                    this.pinPopupLocally(entityId, null);
                },
            });
        }
    }

    @action
    pinPopupLocally(entityId: string, menuId: string | null) {
        this.popupData.forEach((popup) => {
            if (popup.entity.id === entityId) {
                popup.isPinned = true;
                popup.menuId = menuId;
            }
        });
        this.popupData = [...this.popupData];
    }

    @action
    removePopup(entityId: string) {
        const popup = this.popupData.find(((pd) => pd.entity.id === entityId));
        if (popup) {
            if (!popup.menuId) {
                this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
                return;
            }
            const nonce = this.sender.nextNonce();
            this.webSocket.send<DetachedMenuClosedMessage>({
                event: 'detached_menu_closed',
                nonce,
                menuId: popup.menuId,
            });
            new Promise((resolve) => {
                this.receiver.awaitResponse({
                    nonce,
                    responseType: isObjectClosedResponse,
                    onResponse: (response: ObjectClosedResponse) => {
                        if (response.isSuccess) {
                            this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
                        }
                        resolve(response.isSuccess);
                    },
                    onOffline: () => {
                        this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
                        resolve(true);
                    },
                });
            });
        }
    }

    @action
    addPopup(mesh: THREE.Object3D, position: Position2D, pinned: boolean = false, replace: boolean = false, menuId: string | null = null) {
        if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
            || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
            || mesh instanceof ClazzCommunicationMesh)) {
            const newPopup = {
                mouseX: position.x,
                mouseY: position.y,
                entity: mesh.dataModel,
                applicationId: mesh.parent?.dataModel?.id,
                menuId: menuId,
                isPinned: pinned,
            };

            if (replace) {
                this.popupData = [newPopup];
            } else {
                const popupAlreadyExists = this.popupData.any((pd) => pd.entity.id === mesh.dataModel.id);
                if (popupAlreadyExists) return;

                const notPinnedPopupIndex = this.popupData.findIndex((pd) => !pd.isPinned);

                if (notPinnedPopupIndex === -1) {
                    this.popupData = [...this.popupData, newPopup];
                } else {
                    this.popupData[notPinnedPopupIndex] = newPopup;
                    this.popupData = [...this.popupData];
                }
            }
        }
    }

    onMenuDetached({
        objectId,
        entityType,
        detachId,
        position,
        quaternion,
        scale,
    }: MenuDetachedForwardMessage) {
        const mesh = this.applicationRenderer.getMeshById(detachId);
        if (mesh) {
            this.addPopup(mesh, { x: 100, y: 200 }, true, false, objectId)
            return;
        }
    }

    @action
    onMenuClosed({
        originalMessage: { menuId },
    }: ForwardedMessage<DetachedMenuClosedMessage>): void {
        this.popupData = this.popupData.filter(((pd) => pd.menuId !== menuId));
    }

    willDestroy() {
        this.webSocket.off(MENU_DETACHED_EVENT, this, this.onMenuDetached);
        this.webSocket.off(DETACHED_MENU_CLOSED_EVENT, this, this.onMenuClosed);
    }

    sendPopupPinned(entityId: string) {
    }
}
