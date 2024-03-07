import { createStore } from 'zustand/vanilla';
import {
  ApplicationSettings,
  ApplicationColorSettingId
} from 'some-react-lib/src/utils/settings/settings-schemas';

interface UserSettingsState {
  applicationSettings: ApplicationSettings | null;
  applicationColors: ApplicationColors | null;
}

export const useUserSettingsStore = createStore<UserSettingsState>(() => ({
  applicationSettings: null,
  applicationColors: null,
}));

type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;
