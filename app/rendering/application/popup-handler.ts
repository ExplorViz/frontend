import { setOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { EntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
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
import WebSocketService from "virtual-reality/services/web-socket";
import { getTypeOfEntity, isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import { ForwardedMessage } from "virtual-reality/utils/vr-message/receivable/forwarded";
import { MenuDetachedForwardMessage } from "virtual-reality/utils/vr-message/receivable/menu-detached-forward";
import { isMenuDetachedResponse, MenuDetachedResponse } from "virtual-reality/utils/vr-message/receivable/response/menu-detached";
import { isObjectClosedResponse, ObjectClosedResponse } from "virtual-reality/utils/vr-message/receivable/response/object-closed";
import { DetachedMenuClosedMessage, DETACHED_MENU_CLOSED_EVENT } from "virtual-reality/utils/vr-message/sendable/request/detached_menu_closed";
import { MenuDetachedMessage, MENU_DETACHED_EVENT } from "virtual-reality/utils/vr-message/sendable/request/menu_detached";

type PopupData = {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
    mesh: EntityMesh,
    applicationId: string,
    isPinned: boolean,
    menuId: string | null,
};

export default class PopupHandler {

    @service('application-renderer')
    applicationRenderer!: ApplicationRenderer;

    @service('web-socket')
    private webSocket!: WebSocketService;

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
    pinPopup(popup: PopupData) {
        const mesh = popup.mesh;
        const entityId = mesh.dataModel.id;
        const worldPosition = new THREE.Vector3()
        mesh.getWorldPosition(worldPosition)
        worldPosition.y += 0.3;
        // Wait for backend to assign an id to the detached menu.
        this.webSocket.sendRespondableMessage<MenuDetachedMessage, MenuDetachedResponse>(
            {
                event: 'menu_detached',
                detachId: entityId,
                entityType: getTypeOfEntity(mesh),
                position: worldPosition.toArray(),
                quaternion: [0, 0, 0, 0],
                scale: [1, 1, 1],
                nonce: 0 // will be overwritten
            },
            {
                responseType: isMenuDetachedResponse,
                onResponse: (response: MenuDetachedResponse) => {
                    this.pinPopupLocally(entityId, response.objectId);
                    return true;
                },
                onOffline: () => {
                    this.pinPopupLocally(entityId, null);
                },
            }
        )
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
            this.webSocket.sendRespondableMessage<DetachedMenuClosedMessage, ObjectClosedResponse>(
                {
                    event: 'detached_menu_closed',
                    menuId: popup.menuId,
                    nonce: 0 // will be overwritten
                },
                {
                    responseType: isObjectClosedResponse,
                    onResponse: (response: ObjectClosedResponse) => {
                        if (response.isSuccess) {
                            this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
                        }
                        return response.isSuccess
                    },
                    onOffline: () => {
                        this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
                    },
                }
            )
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
                mesh: mesh,
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
        // TODO app communication workaround. FIX/ implement better. Access list of links somehow.
        const appCommunicationMesh = this.applicationRenderer.openApplications[0].parent?.children.find((x) => x.dataModel.id === detachId)
        if (appCommunicationMesh) {
            this.addPopup(appCommunicationMesh, { x: 100, y: 200 }, true, false, objectId)
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
}
