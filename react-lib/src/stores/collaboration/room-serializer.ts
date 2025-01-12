import { createStore } from "zustand/vanilla";

import {
  SerializedAnnotation,
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
  SerializedLandscape,
  SerializedPopup,
  SerializedRoom,
} from "react-lib/src/utils/collaboration/web-socket-messages/types/serialized-room";

interface RoomSerializerState {
  serializedRoom?: SerializedRoom;
}

export const useRoomSerializerStore = createStore<RoomSerializerState>(
  (set, get) => ({
    serializedRoom: undefined,
    // TODO methods
  })
);
