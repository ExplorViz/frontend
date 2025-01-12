// import { createStore } from 'zustand/vanilla';
// import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';


// interface LinkRendererState {
//     linkIdToMesh: Map<string, ClazzCommunicationMesh> ;
//     addLinkIdToMesh: (id: string, newMesh: ClazzCommunicationMesh) => void;
//     _flag: boolean;
// }

// export const useLinkRendererStore = createStore<LinkRendererState>(() => ({
//     linkIdToMesh: new Map(),
//     addLinkIdToMesh,
//     _flag: false,
// }));

// function addLinkIdToMesh(id: string, newMesh: ClazzCommunicationMesh) {
//     useLinkRendererStore.setState((prev) => ({
//         linkIdToMesh: new Map(prev.linkIdToMesh).set(id, newMesh)
//     }));
// }