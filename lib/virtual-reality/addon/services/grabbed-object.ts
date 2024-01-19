import Service, { inject as service } from '@ember/service';
import MessageSender from 'collaborative-mode/services/message-sender';
import WebSocketService from 'collaborative-mode/services/web-socket';
import * as THREE from 'three';
import { GrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object';
import {
  ObjectGrabbedResponse,
  isObjectGrabbedResponse,
} from 'virtual-reality/utils/vr-web-wocket-messages/receivable/response/object-grabbed';
import {
  OBJECT_GRABBED_EVENT,
  ObjectGrabbedMessage,
} from 'virtual-reality/utils/vr-web-wocket-messages/sendable/request/object-grabbed';
export default class GrabbedObjectService extends Service {
  @service('message-sender')
  private sender!: MessageSender;

  @service('web-socket')
  private webSocket!: WebSocketService;

  /**
   * Counts how often an object has been requested to be grabbed.
   *
   * This counter is incremented when an object is grabbed and decremented
   * when the object is released.
   */
  private grabCounters = new Map<GrabbableObject, number>();

  /**
   * A promise for every object that has been requested to be grabbed that
   * resolves to the response of the backend.
   */
  private grabRequests = new Map<GrabbableObject, Promise<boolean>>();

  /**
   * A set that contains all objects that the backend allowed to be grabbed.
   */
  private grabbedObjects = new Set<GrabbableObject>();

  /**
   * Asks the backend whether the given object can be grabbed
   *
   * In offline mode, the promise always completes with `true`.
   *
   * @param object The grabbed grabbed.
   * @returns A promise that resolves to the answer of the backend (i.e., `true`
   * when the object can be grabbed and `false` otherwise).
   */
  private sendGrabRequest(object: GrabbableObject): Promise<boolean> {
    // The backend does not have to be notified when objects without an ID
    // are grabbed.
    const objectId = object.getGrabId();
    if (!objectId) return Promise.resolve(true);

    return this.webSocket.sendRespondableMessage<
      ObjectGrabbedMessage,
      ObjectGrabbedResponse
    >(
      OBJECT_GRABBED_EVENT,
      // Send object grab message.
      {
        event: 'object_grabbed',
        objectId,
        nonce: 0, // will be overwritten
      },
      // Wait for response.
      {
        responseType: isObjectGrabbedResponse,
        onResponse: (response: ObjectGrabbedResponse) => response.isSuccess,
      }
    );
  }

  /**
   * Registers that the given object has been grabbed.
   *
   * When the object has not been grabbed before, the backend is asked whether
   * the object can be grabbed.
   *
   * @param object The grabbed object.
   * @returns A promise that resolves to the answer of the backend to the last
   * request to grab the object (i.e., `true` when the object can be grabbed
   * and `false` otherwise).
   */
  async grabObject(object: GrabbableObject): Promise<boolean> {
    const count = this.getGrabCount(object);
    this.grabCounters.set(object, count + 1);

    // If the object has not been grabbed before, ask the server whether we
    // are allowed to grab the object.
    const request =
      this.grabRequests.get(object) || this.sendGrabRequest(object);
    this.grabRequests.set(object, request);

    // Remember that the object has been grabbed successfully.
    const result = await request;
    if (result && this.grabCounters.has(object))
      this.grabbedObjects.add(object);
    return result;
  }

  /**
   * Gets the number of controllers that are currentlay grabbing the given
   * object.
   *
   * @param object The object to get the counter for.
   * @returns The number of controllers that are grabbing the object.
   */
  getGrabCount(object: GrabbableObject): number {
    return this.grabCounters.get(object) || 0;
  }

  /**
   * Registers that the given object has been released.
   *
   * If the object is not grabbed by any controller anymore, the backend is
   * notified that the object has been released.
   *
   * @param object The releasaed object.
   */
  releaseObject(object: GrabbableObject) {
    const count = this.grabCounters.get(object);
    if (count) {
      this.grabCounters.set(object, count - 1);

      // If the object is not grabbed anymore by any controller, notify the
      // backend that the object has been released.
      if (count === 1) {
        const objectId = object.getGrabId();
        if (objectId) this.sender.sendObjectReleased(objectId);
        this.grabCounters.delete(object);
        this.grabRequests.delete(object);
        this.grabbedObjects.delete(object);
      }
    }
  }

  /**
   * Sends the positions of all grabbed objects to the backend.
   */
  sendObjectPositions() {
    this.grabbedObjects.forEach((object) => {
      const objectId = object.getGrabId();
      if (objectId) {
        const position = new THREE.Vector3();
        object.getWorldPosition(position);

        const quaternion = new THREE.Quaternion();
        object.getWorldQuaternion(quaternion);

        const { scale } = object;

        this.sender.sendObjectMoved(objectId, position, quaternion, scale);
      }
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'grabbed-object': GrabbedObjectService;
  }
}
