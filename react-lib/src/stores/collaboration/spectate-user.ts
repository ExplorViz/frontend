import { createStore } from 'zustand/vanilla';

import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import RemoteUser from 'react-lib/src/utils/collaboration/remote-user';

interface SpectateUserState {
  // TODO migrate RemoteUser first
  spectatedUser: RemoteUser | null;
  cameraControls: CameraControls | null;
  spectateConfigurationId: string;
  spectatingUsers: Set<string>;
  // TODO migrate VrPose first
  // lastPose?: VrPose;
}

export const useSpectateUserStore = createStore<SpectateUserState>(
  (set, get) => ({
    spectatedUser: null,
    cameraControls: null,
    spectateConfigurationId: 'default',
    spectatingUsers: new Set<string>(),
    // lastPose: undefined,
  })
);
