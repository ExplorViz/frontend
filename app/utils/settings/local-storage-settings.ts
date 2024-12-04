import isObject, { objectsHaveSameKeys } from '../object-helpers';
import { defaultVizSettings } from './default-settings';
import { VisualizationSettings, RangeSetting } from './settings-schemas';

export function getStoredSettings(): VisualizationSettings {
  const userApplicationSettingsJSON = localStorage.getItem(
    'userApplicationSettings'
  );

  if (userApplicationSettingsJSON === null) {
    return defaultVizSettings;
  }

  const parsedApplicationSettings = JSON.parse(userApplicationSettingsJSON);

  if (areValidApplicationSettings(parsedApplicationSettings)) {
    return parsedApplicationSettings;
  } else {
    localStorage.removeItem('userApplicationSettings');
    return defaultVizSettings;
  }
}

export function areValidApplicationSettings(maybeSettings: unknown) {
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

export function saveSettings(applicationSettings: VisualizationSettings) {
  localStorage.setItem(
    'userApplicationSettings',
    JSON.stringify(applicationSettings)
  );
}
