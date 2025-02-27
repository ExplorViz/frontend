import { createStore } from 'zustand/vanilla';

interface RoomServiceState {}

export const useRoomServiceStore = createStore<RoomServiceState>(
  (set, get) => ({
    // TODO methods
  })
);
