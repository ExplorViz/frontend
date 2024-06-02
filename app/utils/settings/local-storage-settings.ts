import isObject, { objectsHaveSameKeys } from '../object-helpers';
import { defaultApplicationSettings } from './default-settings';
import { ApplicationSettings, RangeSetting } from './settings-schemas';

export function getStoredSettings(): ApplicationSettings {
  const userApplicationSettingsJSON = localStorage.getItem(
    'userApplicationSettings'
  );

  if (userApplicationSettingsJSON === null) {
    return defaultApplicationSettings;
  }

  const parsedApplicationSettings = JSON.parse(userApplicationSettingsJSON);

  if (areValidApplicationSettings(parsedApplicationSettings)) {
    return parsedApplicationSettings;
  } else {
    localStorage.removeItem('userApplicationSettings');
    return defaultApplicationSettings;
  }
}

export function areValidApplicationSettings(maybeSettings: unknown) {
  return (
    isObject(maybeSettings) &&
    objectsHaveSameKeys(maybeSettings, defaultApplicationSettings)
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

export function saveSettings(applicationSettings: ApplicationSettings) {
  localStorage.setItem(
    'userApplicationSettings',
    JSON.stringify(applicationSettings)
  );
}
