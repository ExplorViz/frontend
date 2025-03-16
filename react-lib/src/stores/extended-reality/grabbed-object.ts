import { create } from 'zustand';
import { GrabbableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/grabbable-object';
import * as THREE from 'three';
import {
  ObjectGrabbedResponse,
  isObjectGrabbedResponse,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/receivable/response/object-grabbed';
import {
  OBJECT_GRABBED_EVENT,
  ObjectGrabbedMessage,
} from 'react-lib/src/utils/extended-reality/vr-web-wocket-messages/sendable/request/object-grabbed';
import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';

// TODO: Remove add and remove functions for attributes
//       after full migration

interface GrabbedObjectState {
  grabCounters: Map<GrabbableObject, number>;
  addGrabCounter: (object: GrabbableObject, val: number) => void;
  removeGrabCounter: (object: GrabbableObject) => void;
  grabRequests: Map<GrabbableObject, Promise<boolean>>;
  addGrabRequest: (object: GrabbableObject, req: Promise<boolean>) => void;
  removeGrabRequest: (object: GrabbableObject) => void;
  grabbedObjects: Set<GrabbableObject>;
  addGrabObject: (object: GrabbableObject) => void;
  removeGrabObject: (object: GrabbableObject) => void;
  _sendGrabRequest: (object: GrabbableObject) => Promise<boolean>;
  grabObject: (object: GrabbableObject) => Promise<boolean>;
  getGrabCount: (object: GrabbableObject) => number;
  releaseObject: (object: GrabbableObject) => void;
  sendObjectPositions: () => void;
}

export const useGrabbedObjectStore = create<GrabbedObjectState>((set, get) => ({
  grabCounters: new Map<GrabbableObject, number>(),
  addGrabCounter,
  removeGrabCounter,
  grabRequests: new Map<GrabbableObject, Promise<boolean>>(),
  addGrabRequest,
  removeGrabRequest,
  grabbedObjects: new Set<GrabbableObject>(),
  addGrabObject,
  removeGrabObject,

  /**
   * Asks the backend whether the given object can be grabbed
   *
   * In offline mode, the promise always completes with `true`.
   *
   * @param object The grabbed grabbed.
   * @returns A promise that resolves to the answer of the backend (i.e., `true`
   * when the object can be grabbed and `false` otherwise).
   */
  _sendGrabRequest: (object: GrabbableObject): Promise<boolean> => {
    // The backend does not have to be notified when objects without an ID
    // are grabbed.
    const objectId = object.getGrabId();
    if (!objectId) return Promise.resolve(true);

    return useWebSocketStore
      .getState()
      .sendRespondableMessage<ObjectGrabbedMessage, ObjectGrabbedResponse>(
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
  },

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
  grabObject: async (object: GrabbableObject): Promise<boolean> => {
    const count = get().getGrabCount(object);
    set({ grabCounters: new Map(get().grabCounters).set(object, count + 1) });

    // If the object has not been grabbed before, ask the server whether we
    // are allowed to grab the object.
    const request =
      get().grabRequests.get(object) || get()._sendGrabRequest(object);
    set({ grabRequests: new Map(get().grabRequests).set(object, request) });

    // Remember that the object has been grabbed successfully.
    const result = await request;
    if (result && get().grabCounters.has(object))
      set({ grabbedObjects: new Set(get().grabbedObjects).add(object) });

    return result;
  },

  /**
   * Gets the number of controllers that are currentlay grabbing the given
   * object.
   *
   * @param object The object to get the counter for.
   * @returns The number of controllers that are grabbing the object.
   */
  getGrabCount: (object: GrabbableObject): number => {
    return get().grabCounters.get(object) || 0;
  },

  /**
   * Registers that the given object has been released.
   *
   * If the object is not grabbed by any controller anymore, the backend is
   * notified that the object has been released.
   *
   * @param object The releasaed object.
   */
  releaseObject: (object: GrabbableObject) => {
    const count = get().grabCounters.get(object);
    if (count) {
      set({ grabCounters: new Map(get().grabCounters).set(object, count - 1) });

      // If the object is not grabbed anymore by any controller, notify the
      // backend that the object has been released.
      if (count === 1) {
        const objectId = object.getGrabId();
        if (objectId)
          useMessageSenderStore.getState().sendObjectReleased(objectId);
        let newGrabCounters = get().grabCounters;
        newGrabCounters.delete(object);
        set({ grabCounters: newGrabCounters });
        let newGrabRequests = get().grabRequests;
        newGrabRequests.delete(object);
        set({ grabRequests: newGrabRequests });
        let newGrabbedObjects = get().grabbedObjects;
        newGrabbedObjects.delete(object);
        set({ grabbedObjects: newGrabbedObjects });
      }
    }
  },

  /**
   * Sends the positions of all grabbed objects to the backend.
   */
  sendObjectPositions: () => {
    get().grabbedObjects.forEach((object) => {
      const objectId = object.getGrabId();
      if (objectId) {
        const position = new THREE.Vector3();
        object.getWorldPosition(position);

        const quaternion = new THREE.Quaternion();
        object.getWorldQuaternion(quaternion);

        const { scale } = object;

        useMessageSenderStore
          .getState()
          .sendObjectMoved(objectId, position, quaternion, scale);
      }
    });
  },
}));

function addGrabCounter(object: GrabbableObject, val: number) {
  useGrabbedObjectStore.setState((prev) => ({
    grabCounters: new Map(prev.grabCounters).set(object, val),
  }));
}

function removeGrabCounter(object: GrabbableObject) {
  useGrabbedObjectStore.setState((prev) => {
    const updatedMap = new Map(prev.grabCounters);
    updatedMap.delete(object);
    return {
      grabCounters: updatedMap,
    };
  });
}

function addGrabRequest(object: GrabbableObject, req: Promise<boolean>) {
  useGrabbedObjectStore.setState((prev) => ({
    grabRequests: new Map(prev.grabRequests).set(object, req),
  }));
}

function removeGrabRequest(object: GrabbableObject) {
  useGrabbedObjectStore.setState((prev) => {
    const updatedMap = new Map(prev.grabRequests);
    updatedMap.delete(object);
    return {
      grabRequests: updatedMap,
    };
  });
}

function addGrabObject(object: GrabbableObject) {
  useGrabbedObjectStore.setState((prev) => ({
    grabbedObjects: new Set(prev.grabbedObjects).add(object),
  }));
}

function removeGrabObject(object: GrabbableObject) {
  useGrabbedObjectStore.setState((prev) => {
    const updatedSet = new Set(prev.grabbedObjects);
    updatedSet.delete(object);
    return {
      grabbedObjects: updatedSet,
    };
  });
}
