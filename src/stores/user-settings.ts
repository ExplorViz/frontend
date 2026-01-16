import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import {
  blueColors,
  classicColors,
  ColorSchemeId,
  darkColors,
  defaultColors,
  desertCity,
} from 'explorviz-frontend/src/utils/settings/color-schemes';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  ColorSettingId,
  ColorSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
  isSelectSetting,
  VisualizationSettingId,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import * as THREE from 'three';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserSettingsState {
  visualizationSettings: VisualizationSettings; // tracked
  colors: ExplorVizColors | undefined; // tracked
  presets: Record<string, VisualizationSettings>; // stored presets for settings
  selectedPreset: string | null; // name of the currently selected preset

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
  setColorsFromSettings: () => void;
  setVisualizationSettings: (value: VisualizationSettings) => void;

  // Preset management functions
  addPreset: (presetName: string, overwrite?: boolean) => boolean;
  savePreset: (presetName: string) => boolean;
  loadPreset: (presetName: string) => boolean;
  removePreset: (presetName: string) => boolean;
  renamePreset: (
    oldName: string,
    newName: string,
    overwrite?: boolean
  ) => boolean;
  listPresets: () => string[];
  setSelectedPreset: (presetName: string | null) => void;
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set, get) => ({
      visualizationSettings: defaultVizSettings,
      colors: undefined,
      presets: {},
      selectedPreset: null,

      // Used as constructor for applicationColors
      _constructApplicationColors: () => {
        get().setColorsFromSettings();
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
          // Trigger zustand update
          set({
            visualizationSettings: JSON.parse(
              JSON.stringify(visualizationSettings)
            ),
          });
        }
      },

      applyDefaultSettings: () => {
        set({
          visualizationSettings: JSON.parse(JSON.stringify(defaultVizSettings)),
        });
      },

      shareVisualizationSettings: () => {
        useMessageSenderStore
          .getState()
          .sendSharedSettings(get().visualizationSettings);
      },

      updateSettings: (settings: VisualizationSettings) => {
        set({ visualizationSettings: settings });
      },

      updateSetting: (name: VisualizationSettingId, value?: unknown) => {
        const setting = { ...get().visualizationSettings[name] };

        const newValue = value ?? defaultVizSettings[name].value;

        if (isRangeSetting(setting) && typeof newValue === 'number') {
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
            scheme = { ...defaultColors, ...classicColors };
            break;
          case 'blue':
            scheme = { ...defaultColors, ...blueColors };
            break;
          case 'dark':
            scheme = { ...defaultColors, ...darkColors };
            break;
          case 'desert':
            scheme = { ...defaultColors, ...desertCity };
            break;
          default:
            scheme = { ...defaultColors };
            break;
        }

        let settingId: keyof ColorSettings;
        for (settingId in get().colors) {
          let newVisualizationSettings = { ...get().visualizationSettings };
          newVisualizationSettings[settingId].value = scheme[settingId];
          set({ visualizationSettings: newVisualizationSettings });
        }
      },

      setColorsFromSettings: () => {
        const visualizationSettings = get().visualizationSettings;

        set({
          colors: {
            foundationColor: new THREE.Color(
              visualizationSettings.foundationColor.value
            ),
            componentRootLevelColor: new THREE.Color(
              visualizationSettings.componentRootLevelColor.value
            ),
            componentDeepestLevelColor: new THREE.Color(
              visualizationSettings.componentDeepestLevelColor.value
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
            addedComponentColor: new THREE.Color(
              visualizationSettings.addedComponentColor.value
            ),
            removedComponentColor: new THREE.Color(
              visualizationSettings.removedComponentColor.value
            ),
            unchangedComponentColor: new THREE.Color(
              visualizationSettings.unchangedComponentColor.value
            ),
            addedClassColor: new THREE.Color(
              visualizationSettings.addedClassColor.value
            ),
            modifiedClassColor: new THREE.Color(
              visualizationSettings.modifiedClassColor.value
            ),
            removedClassColor: new THREE.Color(
              visualizationSettings.removedClassColor.value
            ),
            unchangedClassColor: new THREE.Color(
              visualizationSettings.unchangedClassColor.value
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

      // ----------------------------
      // Preset management functions
      // ----------------------------

      /**
       * Add a new preset using the current visualizationSettings.
       * If overwrite = false and preset already exists -> returns false.
       * Returns true when preset successfully created/overwritten.
       */
      addPreset: (presetName: string, overwrite = false) => {
        if (!presetName || presetName.trim().length === 0) return false;
        const normalized = presetName.trim();
        const existing = get().presets[normalized];
        if (existing && !overwrite) return false;

        const serialized = deepClone(get().visualizationSettings);
        const newPresets = { ...get().presets, [normalized]: serialized };
        set({ presets: newPresets });
        return true;
      },

      /**
       * Save/overwrite an existing preset with the current settings.
       * Returns true when saved.
       */
      savePreset: (presetName: string) => {
        if (!presetName || presetName.trim().length === 0) return false;
        const normalized = presetName.trim();
        const serialized = deepClone(get().visualizationSettings);
        const newPresets = { ...get().presets, [normalized]: serialized };
        set({ presets: newPresets });
        return true;
      },

      /**
       * Load a preset into active visualization settings.
       * Returns true when successful, false when not found or invalid.
       */
      loadPreset: (presetName: string) => {
        if (!presetName || presetName.trim().length === 0) return false;
        const normalized = presetName.trim();
        const preset = get().presets[normalized];
        if (!preset) return false;

        try {
          get().updateSettings(preset);
          return true;
        } catch {
          return false;
        }
      },

      /**
       * Remove a preset by name. Returns true if removed, false if not existing.
       */
      removePreset: (presetName: string) => {
        if (!presetName || presetName.trim().length === 0) return false;
        const normalized = presetName.trim();
        if (!get().presets[normalized]) return false;
        const newPresets = { ...get().presets };
        delete newPresets[normalized];
        set({ presets: newPresets });
        // Clear selected preset if it was the one removed
        if (get().selectedPreset === normalized) {
          set({ selectedPreset: null });
        }
        return true;
      },

      /**
       * Rename an existing preset. If newName exists and overwrite=false => returns false.
       * Returns true on success.
       */
      renamePreset: (oldName: string, newName: string, overwrite = false) => {
        if (!oldName || !newName) return false;
        const a = oldName.trim();
        const b = newName.trim();
        if (!a || !b) return false;
        const presets = get().presets;
        if (!presets[a]) return false;
        if (presets[b] && !overwrite) return false;
        const newPresets = { ...presets };
        newPresets[b] = newPresets[a];
        delete newPresets[a];
        set({ presets: newPresets });
        // Update selected preset if it was the one renamed
        if (get().selectedPreset === a) {
          set({ selectedPreset: b });
        }
        return true;
      },

      listPresets: () => {
        return Object.keys(get().presets);
      },

      setSelectedPreset: (presetName: string | null) => {
        if (
          !presetName ||
          (typeof presetName === 'string' && presetName.trim().length === 0)
        ) {
          set({ selectedPreset: null });
        } else {
          set({ selectedPreset: presetName.trim() });
        }
      },
    }),
    {
      name: 'ExplorVizSettings',
      version: 28, // increment to overwrite existing storage (if needed)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) =>
              key === 'visualizationSettings' ||
              key === 'presets' ||
              key === 'selectedPreset'
          )
        ),
    }
  )
);

useUserSettingsStore.getState()._constructApplicationColors();
