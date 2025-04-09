import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import isObject, {
  objectsHaveSameKeys,
} from 'explorviz-frontend/src/utils/object-helpers';
import { defaultVizSettings } from 'explorviz-frontend/src/utils/settings/default-settings';
import {
  VisualizationSettings,
  RangeSetting,
  VisualizationSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

export function getStoredSettings(): VisualizationSettings {
  return useUserSettingsStore.getState().visualizationSettings;
}

export function getStoredNumberSetting(id: VisualizationSettingId): number {
  const settings = getStoredSettings();
  if (typeof settings[id].value === 'number') {
    return settings[id].value;
  } else {
    console.error('Error in getStoredNumberSetting for setting', settings[id]);
    return 1;
  }
}

export function areValidSettings(maybeSettings: unknown) {
  return (
    isObject(maybeSettings) &&
    objectsHaveSameKeys(maybeSettings, defaultVizSettings)
  );
}

export function validateRangeSetting(
  rangeSetting: RangeSetting,
  value: number
) {
  const { range } = rangeSetting;
  if (Number.isNaN(value)) {
    throw new Error('Value is not a number');
  } else if (value < range.min || value > range.max) {
    throw new Error(`Value must be between ${range.min} and ${range.max}`);
  }
}
