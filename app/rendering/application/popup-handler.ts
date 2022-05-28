import { Application, Class, Node, Package } from "explorviz-frontend/utils/landscape-schemes/structure-data";
import { Position } from '../utils/vr-message/util/position';
import { setOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import ClazzCommuMeshDataModel from "explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model";
import NodeMesh from "explorviz-frontend/view-objects/3d/landscape/node-mesh";
import ClazzMesh from "explorviz-frontend/view-objects/3d/application/clazz-mesh";
import ClazzCommunicationMesh from "explorviz-frontend/view-objects/3d/application/clazz-communication-mesh";
import ApplicationMesh from "explorviz-frontend/view-objects/3d/landscape/application-mesh";
import ComponentMesh from "explorviz-frontend/view-objects/3d/application/component-mesh";
import { Position2D } from "explorviz-frontend/modifiers/interaction-modifier";
import { ForwardedMessage } from "virtual-reality/utils/vr-message/receivable/forwarded";
import { PopupOpenedMessage, POPUP_OPENED_EVENT } from "virtual-reality/utils/vr-message/sendable/popup-opened";
import { PopupClosedMessage, POPUP_CLOSED_EVENT } from "virtual-reality/utils/vr-message/sendable/popup_closed";
import ApplicationRenderer from "explorviz-frontend/services/application-renderer";
import WebSocketService from "virtual-reality/services/web-socket";

type PopupData = {
    mouseX: number,
    mouseY: number,
    entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
    applicationId: string,
    isPinned: boolean,
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
        this.webSocket.on(POPUP_OPENED_EVENT, this, this.onPopupOpened);
        this.webSocket.on(POPUP_CLOSED_EVENT, this, this.onPopupClosed);
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
        this.popupData.forEach((popup) => {
            if (popup.entity.id === entityId) {
                popup.isPinned = true;
                this.sendPopupOpened(popup.applicationId, popup.entity.id, [0, 0, 0]);
            }
        });
        this.popupData = [...this.popupData];
    }

    @action
    removePopup(entityId: string) {
        const popup = this.popupData.find(((pd) => pd.entity.id === entityId));
        if (popup) {
            this.sendPopupClosed(popup.applicationId, popup.entity.id);
        }
        this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
    }

    @action
    addPopup(mesh: THREE.Object3D, position: Position2D, pinned: boolean = false, replace: boolean = false) {
        if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
            || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
            || mesh instanceof ClazzCommunicationMesh)) {
            const newPopup = {
                mouseX: position.x,
                mouseY: position.y,
                entity: mesh.dataModel,
                applicationId: mesh.parent?.dataModel?.id,
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

    @action
    onPopupOpened({
        /* userId, */
        originalMessage: {
            applicationId,
            meshId,
            position
        },
    }: ForwardedMessage<PopupOpenedMessage>) {
        const applicationObject3D = this.applicationRenderer.getApplicationById(applicationId);
        if (!applicationObject3D) {
            return;
        }
        const mesh = applicationObject3D.getBoxMeshbyModelId(meshId) || applicationObject3D.getCommMeshByModelId(meshId);
        if (mesh) {
            this.addPopup(mesh, { x: 100, y: 200 }, true)
        }
    }

    @action
    onPopupClosed({
        /* userId, */
        originalMessage: {
            applicationId,
            meshId,
        },
    }: ForwardedMessage<PopupClosedMessage>) {
        this.removePopup(meshId);
    }

    willDestroy() {
        this.webSocket.off(POPUP_OPENED_EVENT, this, this.onPopupOpened);
        this.webSocket.off(POPUP_CLOSED_EVENT, this, this.onPopupClosed);
    }

    sendPopupOpened(applicationId: string, meshId: string, position: Position) {
        this.webSocket.send<PopupOpenedMessage>({
            event: 'popup_opened',
            applicationId,
            meshId,
            position,
        })
    }

    sendPopupClosed(applicationId: string, meshId: string) {
        this.webSocket.send<PopupClosedMessage>({
            event: 'popup_closed',
            applicationId,
            meshId,
        })
    }
}
