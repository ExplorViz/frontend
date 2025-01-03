import { createStore } from 'zustand/vanilla';
import {
    ApplicationColorSettingId,
    ApplicationSettings,
  } from 'react-lib/src/utils/settings/settings-schemas';
  import {
    getStoredSettings,
  } from 'react-lib/src/utils/settings/local-storage-settings';

interface UserSettingsState {
    applicationSettings: ApplicationSettings;
    // TODO: undefined until full migration
    // Until that, constructor of Ember service will set the state
    applicationColors: ApplicationColors | undefined; 
}

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

export const useUserSettingsStore = createStore<UserSettingsState>(() => ({
    applicationSettings: getStoredSettings(),
    applicationColors: undefined,
}));

