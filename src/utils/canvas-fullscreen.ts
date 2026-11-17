import { useSyncExternalStore } from 'react';

/*
 * Fullscreen of the visualization's canvas alone: no UI, only the scene.
 */

/** The canvas element R3F renders into (id set in CanvasWrapper). */
export function canvasElement(): HTMLCanvasElement | null {
  const byId = document.getElementById('three-js-canvas');
  if (byId instanceof HTMLCanvasElement) return byId;
  return byId?.querySelector('canvas') ?? document.getElementById('rendering')?.querySelector('canvas') ?? null;
}

/** Shows the canvas fullscreen. Resolves false if the browser refuses, e.g. without a user gesture. */
export async function enterCanvasFullscreen(): Promise<boolean> {
  const canvas = canvasElement() as
    | (HTMLCanvasElement & {
        webkitRequestFullscreen?: () => void;
        mozRequestFullScreen?: () => void;
        msRequestFullscreen?: () => void;
      })
    | null;
  if (!canvas) {
    console.error('Unable to enter fullscreen: Canvas element not found');
    return false;
  }
  try {
    if (canvas.requestFullscreen) await canvas.requestFullscreen();
    else if (canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
    else if (canvas.mozRequestFullScreen) canvas.mozRequestFullScreen();
    else if (canvas.msRequestFullscreen) canvas.msRequestFullscreen();
    else {
      console.error('Fullscreen API is not supported in this browser');
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Fullscreen refused:', error);
    return false;
  }
}

/** Leaves fullscreen if the canvas is shown fullscreen. */
export function exitCanvasFullscreen() {
  if (isCanvasFullscreen()) document.exitFullscreen?.().catch(() => {});
}

function isCanvasFullscreen() {
  const element = document.fullscreenElement;
  return !!element && element === canvasElement();
}

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
}

/** Whether the canvas is shown fullscreen right now. */
export function useCanvasFullscreen(): boolean {
  return useSyncExternalStore(subscribe, isCanvasFullscreen, () => false);
}
