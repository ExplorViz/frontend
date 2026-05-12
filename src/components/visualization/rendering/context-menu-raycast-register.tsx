import { useThree } from '@react-three/fiber';
import {
  CLICK_PREVENTION_DEFAULTS,
  maxPointerDriftDuringDelay,
} from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { emitContextMenuFromWorld } from 'explorviz-frontend/src/utils/context-menu-bridge';
import {
  pickContextMenuWorldHit,
  registerContextMenuPick,
  unregisterContextMenuPick,
} from 'explorviz-frontend/src/utils/context-menu-world-pick';
import { useEffect } from 'react';

const { rightClickDelayMs, allowedDelta } = CLICK_PREVENTION_DEFAULTS;

/**
 * Opens the HTML context menu on canvas `contextmenu` using the same raycast + classification as
 * long-press. Instanced meshes (districts/buildings) are authoritative here — R3F `onContextMenu`
 * does not reliably run on custom instanced meshes with OrbitControls, so one DOM path avoids that.
 */
export default function ContextMenuRaycastRegister() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let backgroundMenuTimeoutId: number | null = null;
    let backgroundDriftCleanup: (() => void) | null = null;

    const clearPendingBackgroundMenu = () => {
      if (backgroundMenuTimeoutId !== null) {
        clearTimeout(backgroundMenuTimeoutId);
        backgroundMenuTimeoutId = null;
      }
      backgroundDriftCleanup?.();
      backgroundDriftCleanup = null;
    };

    const pick = (clientX: number, clientY: number) =>
      pickContextMenuWorldHit(
        clientX,
        clientY,
        camera,
        gl.domElement,
        scene.children
      );

    registerContextMenuPick(pick);

    const onDomContextMenu = (e: MouseEvent) => {
      clearPendingBackgroundMenu();

      const hit = pick(e.clientX, e.clientY);

      if (hit.kind !== 'empty') {
        emitContextMenuFromWorld(hit, e);
        return;
      }

      e.preventDefault();

      const { cleanup, getMaxDistance } = maxPointerDriftDuringDelay(e);
      backgroundDriftCleanup = cleanup;

      backgroundMenuTimeoutId = window.setTimeout(() => {
        backgroundMenuTimeoutId = null;
        cleanup();
        backgroundDriftCleanup = null;
        if (getMaxDistance() >= allowedDelta) {
          return;
        }
        emitContextMenuFromWorld(hit, e);
      }, rightClickDelayMs);
    };

    /** Capture so we reliably see the canvas event alongside other listeners. */
    gl.domElement.addEventListener('contextmenu', onDomContextMenu, true);

    return () => {
      clearPendingBackgroundMenu();
      unregisterContextMenuPick();
      gl.domElement.removeEventListener('contextmenu', onDomContextMenu, true);
    };
  }, [scene, camera, gl]);

  return null;
}
