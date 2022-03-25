import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import isObject, { objectsHaveSameKeys } from 'explorviz-frontend/utils/object-helpers';
import {
  classicApplicationColors, classicLandscapeColors, ColorScheme,
  darkApplicationColors, darkLandscapeColors, defaultApplicationColors,
  defaultLandscapeColors, visuallyImpairedApplicationColors,
  visuallyImpairedLandscapeColors,
} from 'explorviz-frontend/utils/settings/color-schemes';
import {
  defaultApplicationSettings, defaultLanscapeSettings,
} from 'explorviz-frontend/utils/settings/default-settings';
import {
  ApplicationColorSettings, ApplicationSettingId,
  ApplicationSettings, isColorSetting, isFlagSetting,
  isRangeSetting, LandscapeColorSettings,
  LandscapeSettingId, LandscapeSettings, RangeSetting,
} from 'explorviz-frontend/utils/settings/settings-schemas';

export default class UserSettings extends Service {
  @tracked
  landscapeSettings!: LandscapeSettings;

  @tracked
  applicationSettings!: ApplicationSettings;

  constructor() {
    super(...arguments);

    try {
      this.restoreLandscapeSettings();
    } catch (e) {
      this.applyDefaultLandscapeSettings();
    }

    try {
      this.restoreApplicationSettings();
    } catch (e) {
      this.applyDefaultApplicationSettings();
    }
  }

  private restoreLandscapeSettings() {
    const userLandscapeSettingsJSON = localStorage.getItem('userLandscapeSettings');

    if (userLandscapeSettingsJSON === null) {
      throw new Error('There are no landscape settings to restore');
    }

    const parsedLandscapeSettings = JSON.parse(userLandscapeSettingsJSON);

    if (this.areValidLandscapeSettings(parsedLandscapeSettings)) {
      this.set('landscapeSettings', parsedLandscapeSettings);
    } else {
      localStorage.removeItem('userLandscapeSettings');
      throw new Error('Landscape settings are invalid');
    }
  }

  private restoreApplicationSettings() {
    const userApplicationSettingsJSON = localStorage.getItem('userApplicationSettings');

    if (userApplicationSettingsJSON === null) {
      throw new Error('There are no application settings to restore');
    }

    const parsedApplicationSettings = JSON.parse(userApplicationSettingsJSON);

    if (this.areValidApplicationSettings(parsedApplicationSettings)) {
      this.set('applicationSettings', parsedApplicationSettings);
    } else {
      localStorage.removeItem('userApplicationSettings');
      throw new Error('Application settings are invalid');
    }
  }

  applyDefaultLandscapeSettings() {
    this.set('landscapeSettings', JSON.parse(JSON.stringify(defaultLanscapeSettings)));
  }

  applyDefaultApplicationSettings() {
    this.set('applicationSettings', JSON.parse(JSON.stringify(defaultApplicationSettings)));
  }

  updateSettings() {
    localStorage.setItem('userLandscapeSettings', JSON.stringify(this.landscapeSettings));
    localStorage.setItem('userApplicationSettings', JSON.stringify(this.applicationSettings));
  }

  updateApplicationSetting(name: ApplicationSettingId, value?: unknown) {
    const setting = this.applicationSettings[name];

    const newValue = value ?? defaultApplicationSettings[name].value;

    if (isRangeSetting(setting) && typeof newValue === 'number') {
      this.validateRangeSetting(setting, newValue);
      this.applicationSettings = {
        ...this.applicationSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
      this.updateSettings();
    } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
      this.applicationSettings = {
        ...this.applicationSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
      this.updateSettings();
    } else if (isColorSetting(setting) && typeof newValue === 'string') {
      /*       const regExHex = /^#(?:[0-9a-f]{3}){1,2}$/i; */
      setting.value = newValue;
      this.updateSettings();
    }
  }

  updateLandscapeSetting(name: LandscapeSettingId, value?: unknown) {
    const setting = this.landscapeSettings[name];

    const newValue = value ?? defaultLanscapeSettings[name].value;

    if (isRangeSetting(setting) && typeof newValue === 'number') {
      this.validateRangeSetting(setting, newValue);
      this.landscapeSettings = {
        ...this.landscapeSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
      this.updateSettings();
    } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
      this.landscapeSettings = {
        ...this.landscapeSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
      this.updateSettings();
    } else if (isColorSetting(setting) && typeof newValue === 'string') {
      /*       const regExHex = /^#(?:[0-9a-f]{3}){1,2}$/i; */
      setting.value = newValue;
      this.updateSettings();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private validateRangeSetting(rangeSetting: RangeSetting, value: number) {
    const { range } = rangeSetting;
    if (Number.isNaN(value)) {
      throw new Error('Value is not a number');
    } else if (value < range.min || value > range.max) {
      throw new Error(`Value must be between ${range.min} and ${range.max}`);
    }
  }

  setColorScheme(scheme: ColorScheme) {
    let applicationColors = defaultApplicationColors;
    let landscapeColors = defaultLandscapeColors;

    if (scheme === 'classic') {
      applicationColors = classicApplicationColors;
      landscapeColors = classicLandscapeColors;
    } else if (scheme === 'dark') {
      applicationColors = darkApplicationColors;
      landscapeColors = darkLandscapeColors;
    } else if (scheme === 'impaired') {
      applicationColors = visuallyImpairedApplicationColors;
      landscapeColors = visuallyImpairedLandscapeColors;
    }

    let settingId: keyof LandscapeColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in landscapeColors) {
      const setting = this.landscapeSettings[settingId];
      setting.value = landscapeColors[settingId];
    }

    let settingId2: keyof ApplicationColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId2 in applicationColors) {
      const setting = this.applicationSettings[settingId2];
      setting.value = applicationColors[settingId2];
    }

    this.notifyPropertyChange('applicationSettings');
    this.notifyPropertyChange('landscapeSettings');

    this.updateSettings();
  }

  // eslint-disable-next-line class-methods-use-this
  private areValidLandscapeSettings(maybeSettings: unknown) {
    return isObject(maybeSettings)
      && objectsHaveSameKeys(maybeSettings, defaultLanscapeSettings);
  }

  // eslint-disable-next-line class-methods-use-this
  private areValidApplicationSettings(maybeSettings: unknown) {
    return isObject(maybeSettings)
      && objectsHaveSameKeys(maybeSettings, defaultApplicationSettings);
  }

  // eslint-disable-next-line class-methods-use-this
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
