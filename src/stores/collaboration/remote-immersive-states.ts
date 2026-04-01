import { create } from 'zustand';

// This state is used to represent other collboration room members being in the immersive view mode

interface RemoteImmersiveState {
    userImmersiveStates: Map<string, string>;
    updateState: (userId: string, meshId: string | null) => void;
    removeUser: (userId: string) => void;
}

export const useRemoteImmersiveStateStore = create<RemoteImmersiveState>((set) => ({
    userImmersiveStates: new Map(),

    updateState: (userId, meshId) =>
        set((state) => {
            const newMap = new Map(state.userImmersiveStates);
            if (meshId) {
                newMap.set(userId, meshId);
            } else {
                newMap.delete(userId);
            }
            return { userImmersiveStates: newMap };
        }),

    removeUser: (userId) =>
        set((state) => {
            const newMap = new Map(state.userImmersiveStates);
            newMap.delete(userId);
            return { userImmersiveStates: newMap };
        }),
}));