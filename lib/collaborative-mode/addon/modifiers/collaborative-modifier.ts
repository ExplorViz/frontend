import { assert } from '@ember/debug';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import { perform, taskFor } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import Modifier, { ArgsFor } from 'ember-modifier';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import * as THREE from 'three';
import { Vector3 } from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import {
  AppOpenedMessage,
  APP_OPENED_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/app_opened';
import {
  ComponentUpdateMessage,
  COMPONENT_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/component_update';
import {
  HighlightingUpdateMessage,
  HIGHLIGHTING_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import {
  MousePingUpdateMessage,
  MOUSE_PING_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';

interface IModifierArgs {
  positional: [];
  named: {
    camera: THREE.Camera;
    raycastObject3D: THREE.Object3D;
    mouseMove?(mesh?: THREE.Object3D): void;
    mouseStop?(mesh?: THREE.Object3D, mousePosition?: Position2D): void;
    mouseOut?(): void;
    onSingleClick?(mesh?: THREE.Object3D): void;
    onDoubleClick?(mesh?: THREE.Object3D): void;
    setPerspective?(position: number[], rotation: number[]): void;
    repositionSphere?(vector: Vector3, user: string, color: string): void;
  };
}

export default class CollaborativeModifierModifier extends Modifier<IModifierArgs> {
  args: IModifierArgs;
  element: unknown;

  constructor(owner: unknown, args: ArgsFor<IModifierArgs>) {
    super(owner, args);
    this.args = args as IModifierArgs;
    this.webSocket.on(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.on(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.on(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    this.webSocket.on(
      HIGHLIGHTING_UPDATE_EVENT,
      this,
      this.onHighlightingUpdate
    );
  }

  willDestroy() {
    this.webSocket.off(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.off(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.off(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    this.webSocket.off(
      HIGHLIGHTING_UPDATE_EVENT,
      this,
      this.onHighlightingUpdate
    );
  }

  debug = debugLogger('CollaborativeModifier');

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  get canvas(): HTMLCanvasElement {
    assert(
      `Element must be 'HTMLCanvasElement' but was ${typeof this.element}`,
      this.element instanceof HTMLCanvasElement
    );
    return this.element;
  }

  get raycastObject3D(): THREE.Object3D {
    return this.args.named.raycastObject3D;
  }

  get camera(): THREE.Camera {
    return this.args.named.camera;
  }

  async onAppOpened({
    originalMessage: { id, position, quaternion, scale },
  }: ForwardedMessage<AppOpenedMessage>): Promise<void> {
    perform(
      this.applicationRenderer.openApplicationTask,
      id,
      {
        position: new THREE.Vector3(...position),
        quaternion: new THREE.Quaternion(...quaternion),
        scale: new THREE.Vector3(...scale),
      },
      false
    );
  }

  onComponentUpdate({
    originalMessage: { isFoundation, appId, isOpened, componentId },
  }: ForwardedMessage<ComponentUpdateMessage>): void {
    const applicationObject3D =
      this.applicationRenderer.getApplicationById(appId);
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshbyModelId(componentId);

    if (isFoundation) {
      if (isOpened) {
        this.applicationRenderer.openAllComponentsLocally(applicationObject3D);
      } else {
        this.applicationRenderer.closeAllComponentsLocally(applicationObject3D);
      }
    } else if (componentMesh instanceof ComponentMesh) {
      this.applicationRenderer.toggleComponentLocally(
        componentMesh,
        applicationObject3D
      );
    }
  }

  onHighlightingUpdate({
    userId,
    originalMessage: { isHighlighted, appId, entityType, entityId },
  }: ForwardedMessage<HighlightingUpdateMessage>): void {
    const user = this.collaborationSession.lookupRemoteUserById(userId);
    if (!user) return;

    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) {
      const mesh = this.applicationRenderer.getMeshById(entityId);
      if (mesh instanceof ClazzCommunicationMesh) {
        this.highlightingService.highlightLink(mesh, user.color);
      }
      return;
    }

    if (isHighlighted) {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        application,
        {
          entityType,
          entityId,
          color: user.color,
        }
      );
    } else {
      this.highlightingService.removeHighlightingLocally(application);
    }
  }

  onMousePingUpdate({
    userId,
    originalMessage: { modelId, position },
  }: ForwardedMessage<MousePingUpdateMessage>): void {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    const applicationObj = this.applicationRenderer.getApplicationById(modelId);

    const point = new THREE.Vector3().fromArray(position);
    if (applicationObj) {
      taskFor(remoteUser.mousePing.ping).perform({
        parentObj: applicationObj,
        position: point,
      });
    }
  }
}
