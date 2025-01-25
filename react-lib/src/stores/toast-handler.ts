import { createStore } from "zustand/vanilla";

import eventEmitter from "react-lib/src/utils/event-emitter";

interface ToastHandlerState {
  showInfoToastMessage: (message: string, header?: string) => void;
  showSuccessToastMessage: (message: string, header?: string) => void;
  showErrorToastMessage: (message: string, header?: string) => void;
}

export const useToastHandlerStore = createStore<ToastHandlerState>(() => ({
  showInfoToastMessage: (message: string, header: string = "") => {
    eventEmitter.emit("newToastMessage", "info", message, header);
  },

  showSuccessToastMessage: (message: string, header: string = "") => {
    eventEmitter.emit("newToastMessage", "success", message, header);
  },

  showErrorToastMessage: (message: string, header: string = "") => {
    eventEmitter.emit("newToastMessage", "error", message, header);
  },
}));
