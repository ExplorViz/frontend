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
  const settingsJson = localStorage.getItem('ExplorVizSettings');

  if (settingsJson === null) {
    return defaultVizSettings;
  }

  const parsedSettings = JSON.parse(settingsJson);

  if (areValidSettings(parsedSettings)) {
    return parsedSettings;
  } else {
    localStorage.removeItem('ExplorVizSettings');
    return defaultVizSettings;
  }
}

export function getStoredSettingValueById(id: VisualizationSettingId) {
  const settings = getStoredSettings();
  return settings[id].value;
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

export function saveSettings(visualizationSettings: VisualizationSettings) {
  localStorage.setItem(
    'ExplorVizSettings',
    JSON.stringify(visualizationSettings)
  );
}
