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
  isColorSetting,
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
  setColorScheme: (schemeId: ColorSchemeId, saveToLocalStorage?: boolean) => void;
  setColorsFromSettings: () => void;
  setVisualizationSettings: (value: VisualizationSettings) => void;

  // Preset management functions
  addPreset: (presetName: string, overwrite?: boolean) => boolean;
  savePreset: (presetName: string) => boolean;
  loadPreset: (presetName: string) => boolean;
  removePreset: (presetName: string) => boolean;
  renamePreset: (oldName: string, newName: string, overwrite?: boolean) => boolean;
  listPresets: () => string[];
  setSelectedPreset: (presetName: string | null) => void;
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;

/**
 * Carries over the stored values that are compatible with the current
 * settings. Settings that are missing (e.g. added after the settings were
 * saved) or have an incompatible value type keep the value of `base`, the
 * defaults unless given. Metadata such as select options always comes from
 * the current defaults.
 */
export function mergeWithDefaultSettings(
  stored: unknown,
  source: string,
  base: VisualizationSettings = defaultVizSettings
): VisualizationSettings {
  const merged = Object.fromEntries(
    Object.entries(defaultVizSettings).map(([id, setting]) => [
      id,
      {
        ...JSON.parse(JSON.stringify(setting)),
        value: JSON.parse(JSON.stringify(base[id as keyof VisualizationSettings].value)),
      },
    ])
  ) as unknown as VisualizationSettings;
  if (!stored || typeof stored !== 'object') {
    return merged;
  }
  const storedSettings = stored as Partial<Record<keyof VisualizationSettings, { value: unknown } | null>>;

  let settingId: keyof VisualizationSettings;
  for (settingId in merged) {
    const defaultSetting = merged[settingId];
    const storedSetting = storedSettings[settingId];

    if (storedSetting === undefined || storedSetting === null) {
      console.warn(`[UserSettings] Setting "${settingId}" is missing from ${source}. Keeping its current value.`);
      continue;
    }

    const defaultValueType = typeof defaultSetting.value;
    const storedValueType = typeof storedSetting.value;
    if (storedValueType !== defaultValueType) {
      console.warn(
        `[UserSettings] Setting "${settingId}" from ${source} has incompatible value type ` +
          `(expected "${defaultValueType}", got "${storedValueType}"). Keeping its current value.`
      );
      continue;
    }

    (merged as Record<string, unknown>)[settingId] = { ...defaultSetting, value: storedSetting.value };
  }
  return merged;
}

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
            visualizationSettings: JSON.parse(JSON.stringify(visualizationSettings)),
          });
        }
        get().setColorsFromSettings();
      },

      applyDefaultSettings: () => {
        set({
          visualizationSettings: JSON.parse(JSON.stringify(defaultVizSettings)),
        });
        get().setColorsFromSettings();
      },

      shareVisualizationSettings: () => {
        // Settings are each person's own; a Room does not share them.
      },

      updateSettings: (settings: VisualizationSettings) => {
        // Presets, Snapshots and Rooms may have been saved before settings were added or changed;
        // what they do not hold stays as it is
        set({
          visualizationSettings: mergeWithDefaultSettings(settings, 'loaded settings', get().visualizationSettings),
        });
        get().setColorsFromSettings();
      },

      updateSetting: (name: VisualizationSettingId, value?: unknown) => {
        const setting = { ...get().visualizationSettings[name] };

        const newValue = value ?? defaultVizSettings[name].value;

        set({
          visualizationSettings: {
            ...get().visualizationSettings,
            [name]: {
              ...JSON.parse(JSON.stringify(setting)),
              value: newValue,
            },
          },
        });
      },

      setColorScheme: (schemeId: ColorSchemeId) => {
        let scheme;

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

        // Only apply keys present on the scheme. `colors` also holds unrelated
        // color settings (e.g. minimapBgColor); assigning scheme[id] for those
        // writes undefined and turns the minimap background black.
        const newVisualizationSettings = { ...get().visualizationSettings };
        for (const settingId of Object.keys(scheme) as (keyof typeof scheme)[]) {
          const current = newVisualizationSettings[settingId];
          if (!current || !isColorSetting(current)) continue;
          newVisualizationSettings[settingId] = {
            ...JSON.parse(JSON.stringify(current)),
            value: scheme[settingId],
          };
        }
        set({ visualizationSettings: newVisualizationSettings });
        get().setColorsFromSettings();
      },

      setColorsFromSettings: () => {
        const visualizationSettings = get().visualizationSettings;
        const colors = {} as ExplorVizColors;

        // Only city/scene ColorSettingIds — not minimap/magnifier/immersive colors
        let settingId: ColorSettingId;
        for (settingId in defaultColors) {
          const setting = visualizationSettings[settingId];
          if (isColorSetting(setting)) {
            colors[settingId] = new THREE.Color(setting.value);
          }
        }

        set({ colors });
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
        if (!presetName || (typeof presetName === 'string' && presetName.trim().length === 0)) {
          set({ selectedPreset: null });
        } else {
          set({ selectedPreset: presetName.trim() });
        }
      },
    }),
    {
      name: 'ExplorVizSettings',
      version: 33, // increment to overwrite existing storage (if needed)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key]) => key === 'visualizationSettings' || key === 'presets' || key === 'selectedPreset'
          )
        ),
      merge: (persistedState: any, currentState) => {
        if (!persistedState) return currentState;

        const mergedVisualizationSettings = mergeWithDefaultSettings(
          persistedState.visualizationSettings,
          'localStorage'
        );

        return {
          ...currentState,
          ...persistedState,
          visualizationSettings: mergedVisualizationSettings,
        };
      },
    }
  )
);

useUserSettingsStore.getState()._constructApplicationColors();
