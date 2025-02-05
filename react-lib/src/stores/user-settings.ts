import { createStore } from 'zustand/vanilla';
import {
  ColorSettingId,
  ColorSettings,
  VisualizationSettingId,
  VisualizationSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
} from 'react-lib/src/utils/settings/settings-schemas';
import {
  getStoredSettings,
  saveSettings,
  validateRangeSetting,
} from 'react-lib/src/utils/settings/local-storage-settings';
import { defaultVizSettings } from 'react-lib/src/utils/settings/default-settings';
import {
  classicColors,
  ColorSchemeId,
  darkColors,
  defaultColors,
  blueColors,
  ColorScheme,
} from 'react-lib/src/utils/settings/color-schemes';
import * as THREE from 'three';
// import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
// import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
// import { useHighlightingStore } from 'react-lib/src/stores/highlighting-service';
// import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
// import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';

interface UserSettingsState {
  visualizationSettings: VisualizationSettings;
  // TODO: undefined until full migration
  // Until that, constructor of Ember service will set the state
  colors: ExplorVizColors | undefined;
  // _constructApplicationColors: () => ApplicationColors;
  applyDefaultVisualizationSettings: (saveToLocalStorage: boolean) => void;
  // shareVisualizationSettings: () => void;
  updateSettings: (settings: VisualizationSettings) => void;
  updateSetting: (name: VisualizationSettingId, value?: unknown) => void;
  setColorScheme: (
    schemeId: ColorSchemeId,
    saveToLocalStorage: boolean
  ) => void;
  updateColors: (updatedColors?: ColorScheme) => void;
  setColorsFromSettings: () => void;
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;

export const useUserSettingsStore = createStore<UserSettingsState>(
  (set, get) => ({
    visualizationSettings: getStoredSettings(),
    colors: undefined,

    // TODO: Clarify functionality!
    // Should be used as constructor for applicationColors
    // _constructApplicationColors: () => {
    //   get().setColorsFromSettings();
    //   get().updateColors();

    //   return get().applicationColors;
    // },

    applyDefaultVisualizationSettings: (saveToLocalStorage = true) => {
      set({
        visualizationSettings: JSON.parse(JSON.stringify(defaultVizSettings)),
      });

      get().updateColors();

      if (saveToLocalStorage) {
        saveSettings(get().visualizationSettings);
      }
    },

    // shareVisualizationSettings: () => {
    // useMessageSenderStore.getState().sendSharedSettings(get().applicationSettings);
    // },

    updateSettings: (settings: VisualizationSettings) => {
      set({ visualizationSettings: settings });

      get().updateColors();
      // useApplicationRendererStore.getState().addCommunicationForAllApplications();
      // useHighlightingStore.getState().updateHighlighting();
      // let tmpDefaultCamera = useLocalUserStore.getState().defaultCamera;
      // tmpDefaultCamera.fov = get().applicationSettings.cameraFov.value;
      // useLocalUserStore.setState({ defaultCamera: tmpDefaultCamera });
      // useLocalUserStore.getState().defaultCamera.updateProjectionMatrix();
    },

    updateSetting: (name: VisualizationSettingId, value?: unknown) => {
      const setting = get().visualizationSettings[name];

      const newValue = value ?? defaultVizSettings[name].value;

      if (isRangeSetting(setting) && typeof newValue === 'number') {
        validateRangeSetting(setting, newValue);
        set({
          visualizationSettings: {
            ...get().visualizationSettings,
            [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
          },
        });
      } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
        set({
          visualizationSettings: {
            ...get().visualizationSettings,
            [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
          },
        });
      } else if (isColorSetting(setting) && typeof newValue === 'string') {
        setting.value = newValue;
      }

      saveSettings(get().visualizationSettings);
    },

    setColorScheme: (schemeId: ColorSchemeId, saveToLocalStorage = true) => {
      let scheme = defaultColors;

      switch (schemeId) {
        case 'classic':
          scheme = classicColors;
          break;
        case 'blue':
          scheme = blueColors;
          break;
        case 'dark':
          scheme = darkColors;
          break;
        default:
          break;
      }

      let settingId: keyof ColorSettings;
      for (settingId in get().colors) {
        let newVisualizationSettings = get().visualizationSettings;
        newVisualizationSettings[settingId].value = scheme[settingId];
        set({ visualizationSettings: newVisualizationSettings });
      }

      get().updateColors(scheme);

      if (saveToLocalStorage) {
        saveSettings(get().visualizationSettings);
      }
    },

    updateColors: (updatedColors?: ColorScheme) => {
      if (!get().colors) {
        get().setColorsFromSettings();
        return;
      }

      let settingId: keyof ColorSettings;
      for (settingId in get().colors) {
        if (updatedColors) {
          let newApplicationColors = get().colors!;
          newApplicationColors[settingId].set(updatedColors[settingId]);
          set({ colors: newApplicationColors });
        } else {
          let newApplicationColors = get().colors!;
          newApplicationColors[settingId].set(
            get().visualizationSettings[settingId].value
          );
          set({ colors: newApplicationColors });
        }
      }

      // updateColors(useSceneRepositoryStore.getState().getScene('browser', false), get().applicationColors);
    },

    setColorsFromSettings: () => {
      const applicationSettings = get().visualizationSettings;

      set({
        colors: {
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
