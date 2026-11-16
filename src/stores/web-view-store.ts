import { create } from 'zustand';

/** Size of the embedded page (iframe) of a web view in CSS pixels. */
export type WebViewSize = {
  width: number;
  height: number;
};

export const DEFAULT_WEB_VIEW_SIZE: WebViewSize = { width: 1280, height: 720 };
export const MIN_WEB_VIEW_SIZE: WebViewSize = { width: 320, height: 180 };
export const MAX_WEB_VIEW_SIZE: WebViewSize = { width: 3840, height: 2160 };

export function clampWebViewSize(size: WebViewSize): WebViewSize {
  return {
    width: Math.round(Math.min(MAX_WEB_VIEW_SIZE.width, Math.max(MIN_WEB_VIEW_SIZE.width, size.width))),
    height: Math.round(Math.min(MAX_WEB_VIEW_SIZE.height, Math.max(MIN_WEB_VIEW_SIZE.height, size.height))),
  };
}

interface WebViewStoreState {
  /** IDs of the cities whose web view is currently open. */
  openCityIds: ReadonlySet<string>;
  /** Last size per city, kept when a web view is closed and opened again. */
  sizes: ReadonlyMap<string, WebViewSize>;
  openWebView: (cityId: string) => void;
  closeWebView: (cityId: string) => void;
  toggleWebView: (cityId: string) => void;
  setWebViewSize: (cityId: string, size: WebViewSize) => void;
}

export const useWebViewStore = create<WebViewStoreState>((set, get) => ({
  openCityIds: new Set(),
  sizes: new Map(),
  openWebView: (cityId) => {
    if (get().openCityIds.has(cityId)) return;
    set((state) => ({ openCityIds: new Set([...state.openCityIds, cityId]) }));
  },
  closeWebView: (cityId) => {
    if (!get().openCityIds.has(cityId)) return;
    set((state) => {
      const next = new Set(state.openCityIds);
      next.delete(cityId);
      return { openCityIds: next };
    });
  },
  toggleWebView: (cityId) => {
    if (get().openCityIds.has(cityId)) {
      get().closeWebView(cityId);
    } else {
      get().openWebView(cityId);
    }
  },
  setWebViewSize: (cityId, size) => {
    set((state) => {
      const next = new Map(state.sizes);
      next.set(cityId, clampWebViewSize(size));
      return { sizes: next };
    });
  },
}));
