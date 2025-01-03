import { createStore } from 'zustand/vanilla';
import { GrabbableObject } from 'react-lib/src/utils/extended-reality/view-objects/interfaces/grabbable-object';

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
}

export const useGrabbedObjectStore = createStore<GrabbedObjectState>(() => ({
    grabCounters: new Map<GrabbableObject, number>(),
    addGrabCounter,
    removeGrabCounter,
    grabRequests: new Map<GrabbableObject, Promise<boolean>>(),
    addGrabRequest,
    removeGrabRequest,
    grabbedObjects: new Set<GrabbableObject>(),
    addGrabObject,
    removeGrabObject,
}));

function addGrabCounter(object: GrabbableObject, val: number) {
    useGrabbedObjectStore.setState((prev) => ({
        grabCounters: new Map(prev.grabCounters).set(object, val)
    }));
}

function removeGrabCounter(object: GrabbableObject) {
    useGrabbedObjectStore.setState((prev) => {
        const updatedMap = new Map(prev.grabCounters);
        updatedMap.delete(object);
        return {
            grabCounters: updatedMap
        }
    });
}

function addGrabRequest(object: GrabbableObject, req: Promise<boolean>) {
    useGrabbedObjectStore.setState((prev) => ({
        grabRequests: new Map(prev.grabRequests).set(object, req)
    }));
}

function removeGrabRequest(object: GrabbableObject) {
    useGrabbedObjectStore.setState((prev) => {
        const updatedMap = new Map(prev.grabRequests);
        updatedMap.delete(object);
        return {
            grabRequests: updatedMap
        }
    });
}

function addGrabObject(object: GrabbableObject) {
    useGrabbedObjectStore.setState((prev) => ({
        grabbedObjects: new Set(prev.grabbedObjects).add(object)
    }));
}

function removeGrabObject(object: GrabbableObject) {
    useGrabbedObjectStore.setState((prev) => {
        const updatedSet = new Set(prev.grabbedObjects);
        updatedSet.delete(object);
        return {
            grabbedObjects: updatedSet
        }
    });
}



