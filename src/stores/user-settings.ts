import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ColorSettingId,
  ColorSettings,
  VisualizationSettingId,
  VisualizationSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
  isSelectSetting,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { validateRangeSetting } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  classicColors,
  ColorSchemeId,
  darkColors,
  defaultColors,
  blueColors,
  ColorScheme,
} from 'explorviz-frontend/src/utils/settings/color-schemes';
import { updateColors as EMUpdateColors } from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import * as THREE from 'three';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';

interface UserSettingsState {
  visualizationSettings: VisualizationSettings; // tracked
  colors: ExplorVizColors | undefined; // tracked
  _constructApplicationColors: () => void;
  applyDefaultSettingsForGroup: (groupId: string) => void;
  applyDefaultSettings: (saveToLocalStorage?: boolean) => void;
  shareVisualizationSettings: () => void;
  updateSettings: (settings: VisualizationSettings) => void;
  updateSetting: (name: VisualizationSettingId, value?: unknown) => void;
  setColorScheme: (
    schemeId: ColorSchemeId,
    saveToLocalStorage?: boolean
  ) => void;
  updateColors: (updatedColors?: ColorScheme) => void;
  setColorsFromSettings: () => void;
  setVisualizationSettings: (value: VisualizationSettings) => void;
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;

export const useUserSettingsStore = create<UserSettingsState>()(
  // @ts-ignore
  persist(
    (set, get) => ({
      visualizationSettings: defaultVizSettings,
      colors: undefined,

      // Used as constructor for applicationColors
      _constructApplicationColors: () => {
        get().setColorsFromSettings();
        get().updateColors();
      },

      setVisualizationSettings: (value: VisualizationSettings) => {
        set({ visualizationSettings: value });
      },

      applyDefaultSettingsForGroup: (groupId: string) => {
        const defaultSettings = JSON.parse(JSON.stringify(defaultVizSettings));
        let settingId: keyof VisualizationSettings;
        const visualizationSettings = get().visualizationSettings;
        for (settingId in visualizationSettings) {
          const setting = visualizationSettings[settingId];
          if (setting.group === groupId) {
            visualizationSettings[settingId] = defaultSettings[settingId];
          }
        }
      },

      applyDefaultSettings: () => {
        set({
          visualizationSettings: JSON.parse(JSON.stringify(defaultVizSettings)),
        });

        get().updateColors();
      },

      shareVisualizationSettings: () => {
        useMessageSenderStore
          .getState()
          .sendSharedSettings(get().visualizationSettings);
      },

      updateSettings: (settings: VisualizationSettings) => {
        set({ visualizationSettings: settings });

        get().updateColors();
        useApplicationRendererStore
          .getState()
          .addCommunicationForAllApplications();
        useHighlightingStore.getState().updateHighlighting();
        let tmpDefaultCamera = useLocalUserStore.getState().defaultCamera;
        tmpDefaultCamera.fov = get().visualizationSettings.cameraFov.value;
        tmpDefaultCamera.updateProjectionMatrix();
        useLocalUserStore.setState({ defaultCamera: tmpDefaultCamera });
      },

      updateSetting: (name: VisualizationSettingId, value?: unknown) => {
        const setting = { ...get().visualizationSettings[name] };

        const newValue = value ?? defaultVizSettings[name].value;

        if (isRangeSetting(setting) && typeof newValue === 'number') {
          validateRangeSetting(setting, newValue);
          set({
            visualizationSettings: {
              ...get().visualizationSettings,
              [name]: {
                ...JSON.parse(JSON.stringify(setting)),
                value: newValue,
              },
            },
          });
        } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
          set({
            visualizationSettings: {
              ...get().visualizationSettings,
              [name]: {
                ...JSON.parse(JSON.stringify(setting)),
                value: newValue,
              },
            },
          });
        } else if (isColorSetting(setting) && typeof newValue === 'string') {
          setting.value = newValue;
          let newVisualizationSettings = { ...get().visualizationSettings };
          newVisualizationSettings[name].value = newValue;
          set({ visualizationSettings: newVisualizationSettings });
        } else if (isSelectSetting(setting) && typeof newValue === 'string') {
          setting.value = newValue;
          let newVisualizationSettings = { ...get().visualizationSettings };
          newVisualizationSettings[name].value = newValue;
          set({ visualizationSettings: newVisualizationSettings });
        }
      },

      setColorScheme: (schemeId: ColorSchemeId) => {
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
          let newVisualizationSettings = { ...get().visualizationSettings };
          newVisualizationSettings[settingId].value = scheme[settingId];
          set({ visualizationSettings: newVisualizationSettings });
        }

        get().updateColors(scheme);
      },

      updateColors: (updatedColors?: ColorScheme) => {
        if (!get().colors) {
          get().setColorsFromSettings();
          return;
        }

        let settingId: keyof ColorSettings;
        for (settingId in get().colors) {
          if (updatedColors) {
            let newApplicationColors = { ...get().colors! };
            newApplicationColors[settingId].set(updatedColors[settingId]);
            set({ colors: newApplicationColors });
          } else {
            let newApplicationColors = { ...get().colors! };
            newApplicationColors[settingId].set(
              get().visualizationSettings[settingId].value
            );
            set({ colors: newApplicationColors });
          }
        }

        EMUpdateColors(
          useSceneRepositoryStore.getState().getScene('browser', false),
          get().colors!
        );
      },

      setColorsFromSettings: () => {
        const visualizationSettings = get().visualizationSettings;

        set({
          colors: {
            foundationColor: new THREE.Color(
              visualizationSettings.foundationColor.value
            ),
            componentOddColor: new THREE.Color(
              visualizationSettings.componentOddColor.value
            ),
            componentEvenColor: new THREE.Color(
              visualizationSettings.componentEvenColor.value
            ),
            classColor: new THREE.Color(visualizationSettings.classColor.value),
            highlightedEntityColor: new THREE.Color(
              visualizationSettings.highlightedEntityColor.value
            ),
            componentTextColor: new THREE.Color(
              visualizationSettings.componentTextColor.value
            ),
            classTextColor: new THREE.Color(
              visualizationSettings.classTextColor.value
            ),
            foundationTextColor: new THREE.Color(
              visualizationSettings.foundationTextColor.value
            ),
            communicationColor: new THREE.Color(
              visualizationSettings.communicationColor.value
            ),
            communicationArrowColor: new THREE.Color(
              visualizationSettings.communicationArrowColor.value
            ),
            backgroundColor: new THREE.Color(
              visualizationSettings.backgroundColor.value
            ),
            k8sNodeColor: new THREE.Color(
              visualizationSettings.k8sNodeColor.value
            ),
            k8sNamespaceColor: new THREE.Color(
              visualizationSettings.k8sNamespaceColor.value
            ),
            k8sDeploymentColor: new THREE.Color(
              visualizationSettings.k8sDeploymentColor.value
            ),
            k8sPodColor: new THREE.Color(
              visualizationSettings.k8sPodColor.value
            ),
            k8sTextColor: new THREE.Color(
              visualizationSettings.k8sTextColor.value
            ),
          },
        });
      },
    }),
    {
      name: 'ExplorVizSettings', // name of the item in the storage (must be unique)
      version: 1,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => key === 'visualizationSettings'
          )
        ),
    }
  )
);

useUserSettingsStore.getState()._constructApplicationColors();
