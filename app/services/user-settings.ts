import Service from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import isObject, {
  objectsHaveSameKeys,
} from 'explorviz-frontend/utils/object-helpers';
import {
  classicApplicationColors,
  ColorSchemeId,
  darkApplicationColors,
  defaultApplicationColors,
  blueApplicationColors,
  ColorScheme,
} from 'explorviz-frontend/utils/settings/color-schemes';
import { defaultApplicationSettings } from 'explorviz-frontend/utils/settings/default-settings';
import {
  ApplicationColorSettingId,
  ApplicationColorSettings,
  ApplicationSettingId,
  ApplicationSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
  RangeSetting,
} from 'explorviz-frontend/utils/settings/settings-schemas';
import * as THREE from 'three';

export default class UserSettings extends Service {
  @tracked
  applicationSettings!: ApplicationSettings;

  /**
   * Colors for application visualization
   *
   * @property applicationColors
   * @type ApplicationColors
   */
  @tracked
  applicationColors!: ApplicationColors;

  constructor() {
    super(...arguments);

    try {
      this.restoreApplicationSettings();
    } catch (e) {
      this.applyDefaultApplicationSettings();
    }
    this.setColorsFromSettings();
  }

  restoreApplicationSettings() {
    const userApplicationSettingsJSON = localStorage.getItem(
      'userApplicationSettings'
    );

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

    this.updateColors();
  }

  @action
  applyDefaultApplicationSettings(saveSettings = true) {
    this.set(
      'applicationSettings',
      JSON.parse(JSON.stringify(defaultApplicationSettings))
    );
    this.setColorsFromSettings();

    if (saveSettings) {
      this.saveSettings();
    }
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
    } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
      this.applicationSettings = {
        ...this.applicationSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
    } else if (isColorSetting(setting) && typeof newValue === 'string') {
      setting.value = newValue;
    }
    this.saveSettings();
  }

  saveSettings() {
    localStorage.setItem(
      'userApplicationSettings',
      JSON.stringify(this.applicationSettings)
    );
  }

  setColorScheme(schemeId: ColorSchemeId, saveSettings = true) {
    let scheme = defaultApplicationColors;

    switch (schemeId) {
      case 'classic':
        scheme = classicApplicationColors;
        break;
      case 'blue':
        scheme = blueApplicationColors;
        break;
      case 'dark':
        scheme = darkApplicationColors;
        break;
      default:
        break;
    }

    let settingId: keyof ApplicationColorSettings;
    for (settingId in this.applicationColors) {
      this.applicationSettings[settingId].value = scheme[settingId];
    }

    this.updateColors(scheme);

    if (saveSettings) {
      this.saveSettings();
    }
  }

  updateColors(updatedColors?: ColorScheme) {
    if (this.applicationColors && updatedColors) {
      let settingId: keyof ApplicationColorSettings;
      for (settingId in this.applicationColors) {
        this.applicationColors[settingId].set(updatedColors[settingId]);
      }
    }
    if (this.applicationColors) {
      let settingId: keyof ApplicationColorSettings;
      for (settingId in this.applicationColors) {
        this.applicationColors[settingId].set(
          this.applicationSettings[settingId].value
        );
      }
    } else {
      this.setColorsFromSettings();
    }
  }

  setColorsFromSettings() {
    const { applicationSettings } = this;

    this.applicationColors = {
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
      clazzTextColor: new THREE.Color(applicationSettings.clazzTextColor.value),
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
    };
  }

  private areValidApplicationSettings(maybeSettings: unknown) {
    return (
      isObject(maybeSettings) &&
      objectsHaveSameKeys(maybeSettings, defaultApplicationSettings)
    );
  }

  private validateRangeSetting(rangeSetting: RangeSetting, value: number) {
    const { range } = rangeSetting;
    if (Number.isNaN(value)) {
      throw new Error('Value is not a number');
    } else if (value < range.min || value > range.max) {
      throw new Error(`Value must be between ${range.min} and ${range.max}`);
    }
  }
}

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
