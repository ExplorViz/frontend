import { assert } from '@ember/debug';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import CollaborativeService from 'collaborative-mode/services/collaborative-service';
import CollaborativeSettingsService from 'collaborative-mode/services/collaborative-settings-service';
import EventSettingsService from 'collaborative-mode/services/event-settings-service';
import {
  Click, CollaborativeEvents, CursorPosition, Perspective
} from 'collaborative-mode/utils/collaborative-data';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier from 'ember-modifier';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import adjustForObjectRotation from 'explorviz-frontend/utils/collaborative-util';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import THREE, { Vector3 } from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { AppOpenedMessage, APP_OPENED_EVENT } from 'virtual-reality/utils/vr-message/sendable/app_opened';
import { MousePingUpdateMessage, MOUSE_PING_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';

interface IModifierArgs {
  positional: [],
  named: {
    camera: THREE.Camera,
    raycastObject3D: THREE.Object3D,
    mouseMove?(mesh?: THREE.Object3D): void,
    mouseStop?(mesh?: THREE.Object3D, mousePosition?: Position2D): void,
    mouseOut?(): void,
    onSingleClick?(mesh?: THREE.Object3D): void,
    onDoubleClick?(mesh?: THREE.Object3D): void,
    setPerspective?(position: number[], rotation: number[]): void,
    repositionSphere?(vector: Vector3, user: string, color: string): void,
  }
}

export default class CollaborativeModifierModifier extends Modifier<IModifierArgs> {
  didInstall() {
    this.collaborativeService.on(CollaborativeEvents.SingleClick, this.receiveSingleClick);
    this.collaborativeService.on(CollaborativeEvents.DoubleClick, this.receiveDoubleClick);
    this.collaborativeService.on(CollaborativeEvents.MouseMove, this.receiveMouseMove);
    this.collaborativeService.on(CollaborativeEvents.MouseStop, this.receiveMouseStop);
    this.collaborativeService.on(CollaborativeEvents.MouseOut, this.receiveMouseOut);
    this.collaborativeService.on(CollaborativeEvents.Perspective, this.receivePerspective);
    this.webSocket.on(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.on(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    // this.webSocket.on(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
    // this.webSocket.on(APP_CLOSED_EVENT, this, this.onAppClosed);
    // this.webSocket.on(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    // this.webSocket.on(HIGHLIGHTING_UPDATE_EVENT, this, this.onHighlightingUpdate);
  }

  willDestroy() {
    this.collaborativeService.off(CollaborativeEvents.SingleClick, this.receiveSingleClick);
    this.collaborativeService.off(CollaborativeEvents.DoubleClick, this.receiveDoubleClick);
    this.collaborativeService.off(CollaborativeEvents.MouseMove, this.receiveMouseMove);
    this.collaborativeService.off(CollaborativeEvents.MouseStop, this.receiveMouseStop);
    this.collaborativeService.off(CollaborativeEvents.MouseOut, this.receiveMouseOut);
    this.collaborativeService.off(CollaborativeEvents.Perspective, this.receivePerspective);
    this.webSocket.off(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.off(APP_OPENED_EVENT, this, this.onAppOpened);
  }

  debug = debugLogger('CollaborativeModifier');

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('collaborative-settings-service')
  settings!: CollaborativeSettingsService;

  @service('collaborative-service')
  collaborativeService!: CollaborativeService;

  @service('event-settings-service')
  eventSettings!: EventSettingsService;

  get canvas(): HTMLCanvasElement {
    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof this.element}`,
      this.element instanceof HTMLCanvasElement,
    );
    return this.element;
  }

  get raycastObject3D(): THREE.Object3D {
    return this.args.named.raycastObject3D;
  }

  get camera(): THREE.Camera {
    return this.args.named.camera;
  }

  @action
  receiveSingleClick(click: Click) {
    if (!this.args.named.onSingleClick || this.settings.userInControl !== click.user) { return; }
    if (!this.settings.watching && !this.eventSettings.singleClick) { return; }

    const applicationMesh = this.getApplicationMeshById(click.id);
    this.args.named.onSingleClick(applicationMesh);
  }

  async onAppOpened({
    originalMessage: {
      id, position, quaternion, scale,
    },
  }: ForwardedMessage<AppOpenedMessage>): Promise<void> {
    if (!this.args.named.onDoubleClick) { return; }
    const application = this.getApplicationMeshById(id);
    if (application) {
      this.args.named.onDoubleClick(application);
    }
  }

  @action
  receiveDoubleClick(click: Click) {
    if (!this.args.named.onDoubleClick || this.settings.userInControl !== click.user) { return; }
    if (!this.settings.watching && !this.eventSettings.doubleClick) { return; }

    const applicationMesh = this.getApplicationMeshById(click.id);
    this.args.named.onDoubleClick(applicationMesh);
  }

  onMousePingUpdate({
    userId,
    originalMessage: { modelId, isApplication, position },
  }: ForwardedMessage<MousePingUpdateMessage>): void {
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    const applicationObj = this.getApplicationMeshById(modelId);
    this.debug('Got mouse ping update - app: ' + applicationObj);

    if (isApplication && applicationObj) {
      perform(remoteUser.mou)
      remoteUser.addMousePing(applicationObj, new THREE.Vector3().fromArray(position));
    } else {
      remoteUser.addMousePing(this.raycastObject3D,
        new THREE.Vector3().fromArray(position));
    }
  }

  @action
  receiveMouseMove(mouse: CursorPosition) {
    if (!this.args.named.mouseMove || !mouse.id) { return; }
    if (!this.settings.watching && !this.eventSettings.mouseMove) { return; }

    const { user } = mouse;
    const vec = adjustForObjectRotation(mouse.point, this.raycastObject3D.quaternion);
    if (this.args.named.repositionSphere) {
      const userObj = this.settings.meeting?.users.find((obj) => obj.name === mouse.user);

      this.args.named.repositionSphere(vec, user!, userObj!.color);
    }

    if (this.settings.userInControl !== mouse.user) { return; }
    const intersectedViewObj = this.getApplicationMeshById(mouse.id);

    if (this.eventSettings.mouseHover) {
      this.args.named.mouseMove(intersectedViewObj);
    }
  }

  @action
  receiveMouseStop(mouse: CursorPosition) {
    if (!this.args.named.mouseStop || !mouse.id) { return; }
    if (!this.settings.watching && !this.eventSettings.mouseStop) { return; }
    if (this.settings.userInControl !== mouse.user) { return; }

    const vec = adjustForObjectRotation(mouse.point, this.raycastObject3D.quaternion);

    const intersectedViewObj = this.getApplicationMeshById(mouse.id);

    if (this.eventSettings.mouseHover) {
      const mousePosition = this.calculateMousePosition(vec);
      this.args.named.mouseStop(intersectedViewObj, mousePosition);
    }
  }

  @action
  receiveMouseOut() {
    if (!this.args.named.mouseOut) { return; }
    if (!this.settings.watching && !this.eventSettings.mouseOut) { return; }

    this.args.named.mouseOut();
  }

  @action
  receivePerspective(perspective: Perspective) {
    if (!this.args.named.setPerspective) { return; }
    if (!perspective.requested && !this.settings.watching && !this.eventSettings.perspective) {
      return;
    }
    if (!perspective.requested && this.settings.userInControl !== perspective.user) {
      return;
    }

    this.args.named.setPerspective(perspective.position, perspective.rotation);
  }

  calculateMousePosition(mouse: Vector3) {
    mouse.project(this.camera);
    mouse.x = Math.round((0.5 + mouse.x / 2) * (this.canvas.width / window.devicePixelRatio));
    mouse.y = Math.round((0.5 - mouse.y / 2) * (this.canvas.height / window.devicePixelRatio));

    const pointerX = mouse.x - 5;
    const pointerY = mouse.y - 5;
    return { x: pointerX, y: pointerY };
  }

  getApplicationMeshById(id: string) {
    return this.raycastObject3D.children.find((obj) => {
      if (obj instanceof ClazzCommunicationMesh
        || obj instanceof ClazzMesh
        || obj instanceof ComponentMesh
        || obj instanceof ApplicationMesh
        || obj instanceof NodeMesh) {
        return obj.dataModel.id === id;
      }
      return false;
    });
  }
}
