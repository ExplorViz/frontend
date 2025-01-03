// import { createStore } from 'zustand/vanilla';

// interface DetachedMenuGroupsState {
//     detachedMenuGroups: Set<DetachedMenuGroup>; // TODO: Uses not yet migrated utils
//     detachedMenuGroupsById: Map<string, DetachedMenuGroup>; // TODO: Uses not yet migrated utils
//     container: THREE.Group;
// }

// export const useDetachedMenuGroupsStore = createStore<DetachedMenuGroupsState>(() => ({
//     detachedMenuGroups: new Set(),
//     detachedMenuGroupsById = new Map(),
//     container = new THREE.Group();
// }));

// // TODO: After migration of utils:
// // Add functions of service as functions in interface