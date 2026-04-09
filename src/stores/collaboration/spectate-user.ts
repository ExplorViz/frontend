import { myPlayer } from 'playroomkit';
import { CameraControls } from 'three-stdlib';
import { create } from 'zustand';

// This store is used to control the spectating logic

interface SpectateUserState {
  // The ID of the spectated player
  spectatedPlayerId: string | null;

  // Reference to the camera controls (to disable them while spectating)
  cameraControls: CameraControls | null;

  // optical data from the other user to sync
  currentProjectionMatrix: number[] | null;

  setCameraControls: (controls: CameraControls) => void;
  activate: (playerId: string) => void;
  deactivate: () => void;
  isActive: () => boolean;
}

export const useSpectateUserStore = create<SpectateUserState>((set, get) => ({
  spectatedPlayerId: null,
  cameraControls: null,
  currentProjectionMatrix: null,

  setCameraControls: (controls) => set({ cameraControls: controls }),

  isActive: () => get().spectatedPlayerId !== null,

  activate: (playerId) => {
    set({ spectatedPlayerId: playerId });

    // disable local camera control
    const controls = get().cameraControls;
    if (controls) {
      controls.enabled = false;
    }

    // Tell the others that the current user is now spectating
    const me = myPlayer();
    if (me) {
      me.setState('spectatingTarget', playerId);
    }
  },

  deactivate: () => {
    set({ spectatedPlayerId: null, currentProjectionMatrix: null });

    // Reactivate the camera controls
    const controls = get().cameraControls;
    if (controls) {
      controls.enabled = true;
    }

    // Tell the others that spectating ended
    const me = myPlayer();
    if (me) {
      me.setState('spectatingTarget', null);
    }
  },
}));