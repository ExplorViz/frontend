import { createStore } from "zustand/vanilla";

interface ReloadHandlerState {
  //   landscapeHttpRequestUtil: LandscapeHttpRequestUtil;
}

export const useReloadHandlerStore = createStore<ReloadHandlerState>(
  (set, get) => ({
    // TODO migrate LandscapeHttpRequestUtil first
    // landscapeHttpRequestUtil: new LandscapeHttpRequestUtil(getOwner(this)),
    // TODO methods
  })
);
