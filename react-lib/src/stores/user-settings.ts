import { createStore } from "zustand/vanilla";
import {
  ApplicationColorSettingId,
  ApplicationColorSettings,
  ApplicationSettingId,
  ApplicationSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
} from "react-lib/src/utils/settings/settings-schemas";
import {
  getStoredSettings,
  saveSettings,
  validateRangeSetting,
} from "react-lib/src/utils/settings/local-storage-settings";
import { defaultApplicationSettings } from "react-lib/src/utils/settings/default-settings";
import {
  classicApplicationColors,
  ColorSchemeId,
  darkApplicationColors,
  defaultApplicationColors,
  blueApplicationColors,
  ColorScheme,
} from "react-lib/src/utils/settings/color-schemes";
import * as THREE from "three";
// import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
// import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
// import { useHighlightingStore } from 'react-lib/src/stores/highlighting-service';
// import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
// import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

interface UserSettingsState {
  applicationSettings: ApplicationSettings;
  // TODO: undefined until full migration
  // Until that, constructor of Ember service will set the state
  applicationColors: ApplicationColors | undefined;
  // _constructApplicationColors: () => ApplicationColors;
  applyDefaultApplicationSettings: (saveToLocalStorage: boolean) => void;
  // shareApplicationSettings: () => void;
  updateSettings: (settings: ApplicationSettings) => void;
  updateApplicationSetting: (
    name: ApplicationSettingId,
    value?: unknown
  ) => void;
  setColorScheme: (
    schemeId: ColorSchemeId,
    saveToLocalStorage: boolean
  ) => void;
  updateColors: (updatedColors?: ColorScheme) => void;
  setColorsFromSettings: () => void;
}

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

export const useUserSettingsStore = createStore<UserSettingsState>(
  (set, get) => ({
    applicationSettings: getStoredSettings(),
    applicationColors: undefined,

    // TODO: Clarify functionality!
    // Should be used as constructor for applicationColors
    // _constructApplicationColors: () => {
    //   get().setColorsFromSettings();
    //   get().updateColors();

    //   return get().applicationColors;
    // },

    applyDefaultApplicationSettings: (saveToLocalStorage = true) => {
      set({
        applicationSettings: JSON.parse(
          JSON.stringify(defaultApplicationSettings)
        ),
      });

      get().updateColors();

      if (saveToLocalStorage) {
        saveSettings(get().applicationSettings);
      }
    },

    // shareApplicationSettings: () => {
    // useMessageSenderStore.getState().sendSharedSettings(get().applicationSettings);
    // },

    updateSettings: (settings: ApplicationSettings) => {
      set({ applicationSettings: settings });

      get().updateColors();
      // useApplicationRendererStore.getState().addCommunicationForAllApplications();
      // useHighlightingStore.getState().updateHighlighting();
      // let tmpDefaultCamera = useLocalUserStore.getState().defaultCamera;
      // tmpDefaultCamera.fov = get().applicationSettings.cameraFov.value;
      // useLocalUserStore.setState({ defaultCamera: tmpDefaultCamera });
      // useLocalUserStore.getState().defaultCamera.updateProjectionMatrix();
    },

    updateApplicationSetting: (name: ApplicationSettingId, value?: unknown) => {
      const setting = get().applicationSettings[name];

      const newValue = value ?? defaultApplicationSettings[name].value;

      if (isRangeSetting(setting) && typeof newValue === "number") {
        validateRangeSetting(setting, newValue);
        set({
          applicationSettings: {
            ...get().applicationSettings,
            [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
          },
        });
      } else if (isFlagSetting(setting) && typeof newValue === "boolean") {
        set({
          applicationSettings: {
            ...get().applicationSettings,
            [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
          },
        });
      } else if (isColorSetting(setting) && typeof newValue === "string") {
        setting.value = newValue;
      }

      saveSettings(get().applicationSettings);
    },

    setColorScheme: (schemeId: ColorSchemeId, saveToLocalStorage = true) => {
      let scheme = defaultApplicationColors;

      switch (schemeId) {
        case "classic":
          scheme = classicApplicationColors;
          break;
        case "blue":
          scheme = blueApplicationColors;
          break;
        case "dark":
          scheme = darkApplicationColors;
          break;
        default:
          break;
      }

      let settingId: keyof ApplicationColorSettings;
      for (settingId in get().applicationColors) {
        let newApplicationSettings = get().applicationSettings;
        newApplicationSettings[settingId].value = scheme[settingId];
        set({ applicationSettings: newApplicationSettings });
      }

      get().updateColors(scheme);

      if (saveToLocalStorage) {
        saveSettings(get().applicationSettings);
      }
    },

    updateColors: (updatedColors?: ColorScheme) => {
      if (!get().applicationColors) {
        get().setColorsFromSettings();
        return;
      }

      let settingId: keyof ApplicationColorSettings;
      for (settingId in get().applicationColors) {
        if (updatedColors) {
          let newApplicationColors = get().applicationColors!;
          newApplicationColors[settingId].set(updatedColors[settingId]);
          set({ applicationColors: newApplicationColors });
        } else {
          let newApplicationColors = get().applicationColors!;
          newApplicationColors[settingId].set(
            get().applicationSettings[settingId].value
          );
          set({ applicationColors: newApplicationColors });
        }
      }

      // updateColors(useSceneRepositoryStore.getState().getScene('browser', false), get().applicationColors);
    },

    setColorsFromSettings: () => {
      const applicationSettings = get().applicationSettings;

      set({
        applicationColors: {
          foundationColor: new THREE.Color(
            applicationSettings.foundationColor.value
          ),
          componentOddColor: new THREE.Color(
            applicationSettings.componentOddColor.value
          ),
          componentEvenColor: new THREE.Color(
            applicationSettings.componentEvenColor.value
          ),
          clazzColor: new THREE.Color(applicationSettings.clazzColor.value),
          highlightedEntityColor: new THREE.Color(
            applicationSettings.highlightedEntityColor.value
          ),
          componentTextColor: new THREE.Color(
            applicationSettings.componentTextColor.value
          ),
          clazzTextColor: new THREE.Color(
            applicationSettings.clazzTextColor.value
          ),
          foundationTextColor: new THREE.Color(
            applicationSettings.foundationTextColor.value
          ),
          communicationColor: new THREE.Color(
            applicationSettings.communicationColor.value
          ),
          communicationArrowColor: new THREE.Color(
            applicationSettings.communicationArrowColor.value
          ),
          backgroundColor: new THREE.Color(
            applicationSettings.backgroundColor.value
          ),
        },
      });
    },
  })
);
