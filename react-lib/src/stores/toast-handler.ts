import { createStore } from "zustand/vanilla";

interface ToastHandlerState {}

export const useToastHandlerStore = createStore<ToastHandlerState>(() => ({}));
