import { assert } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { inject as service } from '@ember/service';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import debugLogger from 'ember-debug-logger';
import Modifier, { ArgsFor } from 'ember-modifier';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
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
import {
  RESTRUCTURE_COMMUNICATION_EVENT,
  RESTRUCTURE_CREATE_OR_DELETE_EVENT,
  RESTRUCTURE_CUT_AND_INSERT_EVENT,
  RESTRUCTURE_MODE_UPDATE_EVENT,
  RESTRUCTURE_UPDATE_EVENT,
  RestructureCommunicationMessage,
  RestructureCreateOrDeleteMessage,
  RestructureCutAndInsertMessage,
  RestructureModeUpdateMessage,
  RestructureUpdateMessage,
} from 'virtual-reality/utils/vr-message/sendable/restructure_update';

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

  constructor(owner: any, args: ArgsFor<IModifierArgs>) {
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
    this.webSocket.on(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this,
      this.onRestructureModeUpdate
    );
    this.webSocket.on(RESTRUCTURE_UPDATE_EVENT, this, this.onRestructureUpdate);
    this.webSocket.on(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this,
      this.onRestructureCreateOrDelete
    );
    this.webSocket.on(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this,
      this.onRestructureCutAndInsert
    );
    this.webSocket.on(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this,
      this.onRestructureCommunication
    );

    registerDestructor(this, this.cleanup);
  }

  cleanup = () => {
    this.removeEventListener();
  };

  removeEventListener() {
    this.webSocket.off(MOUSE_PING_UPDATE_EVENT, this, this.onMousePingUpdate);
    this.webSocket.off(APP_OPENED_EVENT, this, this.onAppOpened);
    this.webSocket.off(COMPONENT_UPDATE_EVENT, this, this.onComponentUpdate);
    this.webSocket.off(
      HIGHLIGHTING_UPDATE_EVENT,
      this,
      this.onHighlightingUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_MODE_UPDATE_EVENT,
      this,
      this.onRestructureModeUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_UPDATE_EVENT,
      this,
      this.onRestructureUpdate
    );
    this.webSocket.off(
      RESTRUCTURE_CREATE_OR_DELETE_EVENT,
      this,
      this.onRestructureCreateOrDelete
    );
    this.webSocket.off(
      RESTRUCTURE_CUT_AND_INSERT_EVENT,
      this,
      this.onRestructureCutAndInsert
    );
    this.webSocket.off(
      RESTRUCTURE_COMMUNICATION_EVENT,
      this,
      this.onRestructureCommunication
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

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

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
    this.applicationRenderer.openApplicationTask.perform(
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

  onRestructureModeUpdate(
    originalMessage: ForwardedMessage<RestructureModeUpdateMessage>
  ): void {
    this.landscapeRestructure.toggleRestructureModeLocally();
  }

  onRestructureUpdate({
    originalMessage: { entityType, entityId, newName, appId },
  }: ForwardedMessage<RestructureUpdateMessage>): void {
    switch (entityType) {
      case 'APP':
        this.landscapeRestructure.updateApplicationName(
          newName,
          entityId,
          true
        );
        break;
      case 'PACKAGE':
        this.landscapeRestructure.updatePackageName(newName, entityId, true);
        break;
      case 'SUBPACKAGE':
        this.landscapeRestructure.updateSubPackageName(newName, entityId, true);
        break;
      case 'CLAZZ':
        this.landscapeRestructure.updateClassName(
          newName,
          entityId,
          appId as string,
          true
        );
    }
  }

  onRestructureCreateOrDelete({
    originalMessage: { action, entityType, name, language, entityId },
  }: ForwardedMessage<RestructureCreateOrDeleteMessage>): void {
    if (action === 'CREATE') {
      switch (entityType) {
        case 'APP':
          this.landscapeRestructure.addApplication(
            name as string,
            language as string,
            true
          );
          break;
        case 'PACKAGE':
          this.landscapeRestructure.addCollaborativePackage(entityId as string);
          break;
        case 'SUBPACKAGE':
          this.landscapeRestructure.addCollaborativeSubPackage(
            entityId as string
          );
          break;
        case 'CLAZZ':
          this.landscapeRestructure.addCollaborativeClass(entityId as string);
          break;
      }
    } else {
      switch (entityType) {
        case 'APP':
          this.landscapeRestructure.deleteCollaborativeApplication(
            entityId as string
          );
          break;
        case 'PACKAGE':
          this.landscapeRestructure.deleteCollaborativePackage(
            entityId as string
          );
          break;
        case 'CLAZZ':
          this.landscapeRestructure.deleteCollaborativeClass(
            entityId as string
          );
          break;
      }
    }
  }

  onRestructureCutAndInsert({
    originalMessage: {
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId,
    },
  }: ForwardedMessage<RestructureCutAndInsertMessage>): void {
    this.landscapeRestructure.insertCollaborativePackagerOrClass(
      destinationEntity,
      destinationId,
      clippedEntity,
      clippedEntityId
    );
  }

  onRestructureCommunication({
    originalMessage: { sourceClassId, targetClassId, methodName },
  }: ForwardedMessage<RestructureCommunicationMessage>): void {
    this.landscapeRestructure.createCollaborativeCommunication(
      sourceClassId,
      targetClassId,
      methodName
    );
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
      remoteUser.mousePing.ping.perform({
        parentObj: applicationObj,
        position: point,
      });
    }
  }
}
