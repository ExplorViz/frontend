import { createStore } from "zustand/vanilla";

// This could probably be a utility

interface MessageSenderState {}

export const useMessageSenderStore = createStore<MessageSenderState>(
  (set, get) => ({
    // TODO methods
  })
);
