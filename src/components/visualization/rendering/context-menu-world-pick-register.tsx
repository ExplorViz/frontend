import { useThree } from '@react-three/fiber';
import {
  pickContextMenuWorldHit,
  registerContextMenuPick,
  unregisterContextMenuPick,
} from 'explorviz-frontend/src/utils/context-menu-world-pick';
import { useEffect } from 'react';

/**
 * Registers `contextMenuPickAt` for touch long-press in the HTML context menu host.
 * Right-click context menu is handled by R3F `onContextMenu` on city meshes.
 */
export default function ContextMenuWorldPickRegister() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const pick = (clientX: number, clientY: number) =>
      pickContextMenuWorldHit(
        clientX,
        clientY,
        camera,
        gl.domElement,
        scene.children
      );

    registerContextMenuPick(pick);
    return () => {
      unregisterContextMenuPick();
    };
  }, [scene, camera, gl]);

  return null;
}
