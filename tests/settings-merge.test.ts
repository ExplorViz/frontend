// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserSettingsStore } from '../src/stores/user-settings';
import { defaultVizSettings } from '../src/utils/settings/default-settings';

describe('loading saved settings', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    useUserSettingsStore.getState().applyDefaultSettings();
  });

  it('keeps the current value of settings that were added after a preset was saved', () => {
    const oldPreset = structuredClone(defaultVizSettings) as Record<string, unknown>;
    delete oldPreset.layoutEngine;
    (oldPreset.buildingMargin as { value: number }).value = 3;
    useUserSettingsStore.getState().updateSetting('layoutEngine', 'maxrects');

    useUserSettingsStore.setState({ presets: { old: oldPreset as never } });
    expect(useUserSettingsStore.getState().loadPreset('old')).toBe(true);

    const settings = useUserSettingsStore.getState().visualizationSettings;
    expect(settings.layoutEngine.value).toBe('maxrects');
    expect(settings.buildingMargin.value).toBe(3);
  });

  it('keeps the current value for values of an incompatible type', () => {
    useUserSettingsStore.getState().updateSetting('cityMargin', 42);
    const loaded = structuredClone(defaultVizSettings) as Record<string, { value: unknown }>;
    loaded.cityMargin.value = 'wide';

    useUserSettingsStore.getState().updateSettings(loaded as never);

    expect(useUserSettingsStore.getState().visualizationSettings.cityMargin.value).toBe(42);
  });

  it('falls back to the default for settings missing from localStorage', async () => {
    const stored = { state: { visualizationSettings: { buildingMargin: { value: 3 } } }, version: 33 };
    useUserSettingsStore.getState().updateSetting('cityMargin', 42);
    localStorage.setItem('ExplorVizSettings', JSON.stringify(stored));

    await useUserSettingsStore.persist.rehydrate();

    const settings = useUserSettingsStore.getState().visualizationSettings;
    expect(settings.buildingMargin.value).toBe(3);
    expect(settings.cityMargin.value).toBe(defaultVizSettings.cityMargin.value);
  });
});
