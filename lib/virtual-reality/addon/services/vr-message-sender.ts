import Service, { inject as service } from '@ember/service';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import THREE from 'three';
import WebSocketService from 'virtual-reality/services/web-socket';
import { MousePingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';
import { PingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/ping_update';
import { TimestampUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import VRController from '../utils/vr-controller';
import { getControllerPose } from '../utils/vr-helpers/vr-poses';
import { DetachableMenu } from '../utils/vr-menus/detachable-menu';
import { AppOpenedMessage } from '../utils/vr-message/sendable/app_opened';
import { ComponentUpdateMessage } from '../utils/vr-message/sendable/component_update';
import { HighlightingUpdateMessage } from '../utils/vr-message/sendable/highlighting_update';
import { ObjectMovedMessage } from '../utils/vr-message/sendable/object_moved';
import { ObjectReleasedMessage } from '../utils/vr-message/sendable/object_released';
import { AppClosedMessage } from '../utils/vr-message/sendable/request/app_closed';
import { DetachedMenuClosedMessage } from '../utils/vr-message/sendable/request/detached_menu_closed';
import { MenuDetachedMessage } from '../utils/vr-message/sendable/request/menu_detached';
import { ObjectGrabbedMessage } from '../utils/vr-message/sendable/request/object_grabbed';
import { SpectatingUpdateMessage } from '../utils/vr-message/sendable/spectating_update';
import { UserControllerConnectMessage } from '../utils/vr-message/sendable/user_controller_connect';
import { UserControllerDisconnectMessage } from '../utils/vr-message/sendable/user_controller_disconnect';
import { ControllerPose, Pose, UserPositionsMessage } from '../utils/vr-message/sendable/user_positions';
import { Position } from '../utils/vr-message/util/position';
import { ControllerId } from '../utils/vr-message/util/controller_id';
import { Nonce } from '../utils/vr-message/util/nonce';

export default class VrMessageSender extends Service {
  @service('web-socket')
  private webSocket!: WebSocketService;

  private lastNonce: Nonce = 0;

  /**
   * Gets the next request identifier.
   *
   * Messages that await responses
   */
  nextNonce() {
    return ++this.lastNonce;
  }

  /**
   * Sends position and rotation information of the local user's camera and
   * controllers.
   */
  sendPoseUpdate(
    camera: Pose,
    controller1?: ControllerPose | undefined,
    controller2?: ControllerPose | undefined,
  ) {
    this.webSocket.send<UserPositionsMessage>({
      event: 'user_positions',
      controller1,
      controller2,
      camera,
    });
  }

  /**
   * Send a request to the backend to grab the object with the given id.
   *
   * @param objectId The id of the object to request to grab.
   * @return A locally unique identifier that is used by the backend to respond to this request.
   */
  sendObjectGrabbed(objectId: string): Nonce {
    const nonce = this.nextNonce();
    this.webSocket.send<ObjectGrabbedMessage>({
      event: 'object_grabbed',
      nonce,
      objectId,
    });
    return nonce;
  }

  /**
   * Sends the position and rotation of a grabbed object to the backend.
   *
   * @param objectId The id of the grabbed object.
   * @param position The new position of the grabbed object in world coordinates.
   * @param quaternion The new rotation of the grabbed object in world coordinates.
   */
  sendObjectMoved(
    objectId: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    scale: THREE.Vector3,
  ) {
    this.webSocket.send<ObjectMovedMessage>({
      event: 'object_moved',
      objectId,
      position: position.toArray(),
      quaternion: quaternion.toArray(),
      scale: scale.toArray(),
    });
  }

  /**
   * Sends a message to the backend that notifies it that the object with the
   * given id has been released and can be grabbed by another user.
   *
   * @param objectId The id of the object to request to grab.
   */
  sendObjectReleased(objectId: string) {
    this.webSocket.send<ObjectReleasedMessage>({
      event: 'object_released',
      objectId,
    });
  }

  /**
   * Informs the backend that an application was closed by this user.
   *
   * @param {string} appId ID of the closed application
   */
  sendAppClosed(appId: string) {
    const nonce = this.nextNonce();
    this.webSocket.send<AppClosedMessage>({
      event: 'app_closed',
      nonce,
      appId,
    });
    return nonce;
  }

  /**
   * Informs the backend that an detached menu was closed by this user.
   *
   * @param objectId The ID (grabId) of the closed menu
   */
  sendDetachedMenuClosed(menuId: string): Nonce {
    const nonce = this.nextNonce();
    this.webSocket.send<DetachedMenuClosedMessage>({
      event: 'detached_menu_closed',
      nonce,
      menuId,
    });
    return nonce;
  }

  /**
   * Informs the backend that a component was opened or closed by this user.
   *
   * @param {string} appId ID of the app which is a parent to the component
   * @param {string} componentId ID of the component which was opened or closed
   * @param {boolean} isOpened Tells whether the component is now open or closed (current state)
   */
  sendComponentUpdate(
    appId: string,
    componentId: string,
    isOpened: boolean,
    isFoundation: boolean,
  ) {
    this.webSocket.send<ComponentUpdateMessage>({
      event: 'component_update',
      appId,
      componentId,
      isOpened,
      isFoundation,
    });
  }

  /**
   * Informs the backend that an entity (clazz or component) was highlighted
   * or unhighlighted.
   *
   * @param {string} appId ID of the parent application of the entity
   * @param {string} entityType Tells whether a clazz/component or communication was updated
   * @param {string} entityId ID of the highlighted/unhighlighted component/clazz
   * @param {boolean} isHighlighted Tells whether the entity has been highlighted or not
   */
  sendHighlightingUpdate(
    appId: string,
    entityType: string,
    entityId: string,
    isHighlighted: boolean,
  ) {
    this.webSocket.send<HighlightingUpdateMessage>({
      event: 'highlighting_update',
      appId,
      entityType,
      entityId,
      isHighlighted,
    });
  }

  /**
   * Informs backend that this user entered or left spectating mode and
   * additionally adds who is spectating who.
   */
  sendSpectatingUpdate(isSpectating: boolean, spectatedUser: string | null) {
    this.webSocket.send<SpectatingUpdateMessage>({
      event: 'spectating_update',
      isSpectating,
      spectatedUser,
    });
  }

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  async sendControllerConnect(controller: VRController | undefined) {
    if (!controller?.connected) return;

    const motionController = await controller.controllerModel
      .motionControllerPromise;
    this.webSocket.send<UserControllerConnectMessage>({
      event: 'user_controller_connect',
      controller: {
        assetUrl: motionController.assetUrl,
        controllerId: controller.gamepadIndex,
        ...getControllerPose(controller),
      },
    });
  }

  /**
   * Informs the backend if a controller was connected/disconnected.
   */
  sendControllerDisconnect(controller: VRController) {
    this.webSocket.send<UserControllerDisconnectMessage>({
      event: 'user_controller_disconnect',
      controllerId: controller.gamepadIndex,
    });
  }

  /**
   * Informs the backend that an app was opened by this user.
   *
   * @param ApplicationObject3D Opened application
   */
  sendAppOpened(application: ApplicationObject3D) {
    this.webSocket.send<AppOpenedMessage>({
      event: 'app_opened',
      id: application.dataModel.id,
      position: application.getWorldPosition(new THREE.Vector3()).toArray(),
      quaternion: application
        .getWorldQuaternion(new THREE.Quaternion())
        .toArray(),
      scale: application.scale.toArray(),
    });
  }

  sendPingUpdate(controllerId: ControllerId, isPinging: boolean) {
    this.webSocket.send<PingUpdateMessage>({
      event: 'ping_update',
      controllerId,
      isPinging,
    });
  }

  sendMousePingUpdate(
    modelId: string,
    isApplication: boolean,
    position: THREE.Vector3,
  ) {
    this.webSocket.send<MousePingUpdateMessage>({
      event: 'mouse_ping_update',
      modelId,
      isApplication,
      position: position.toArray(),
    });
  }

  sendTimestampUpdate(timestamp: number) {
    this.webSocket.send<TimestampUpdateMessage>({
      event: 'timestamp_update',
      timestamp,
    });
  }

  sendMenuDetached(menu: DetachableMenu): Nonce {
    const position = new THREE.Vector3();
    menu.getWorldPosition(position);

    const quaternion = new THREE.Quaternion();
    menu.getWorldQuaternion(quaternion);

    const nonce = this.nextNonce();
    this.webSocket.send<MenuDetachedMessage>({
      event: 'menu_detached',
      nonce,
      detachId: menu.getDetachId(),
      entityType: menu.getEntityType(),
      position: position.toArray(),
      quaternion: quaternion.toArray(),
      scale: menu.scale.toArray(),
    });
    return nonce;
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-message-sender': VrMessageSender;
  }
}
