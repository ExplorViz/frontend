import Service from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import isObject, {
  objectsHaveSameKeys,
} from 'explorviz-frontend/utils/object-helpers';
import {
  classicApplicationColors,
  ColorScheme,
  darkApplicationColors,
  defaultApplicationColors,
  blueApplicationColors,
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
    this.updateColors();
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
      this.updateColors();
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
    this.updateColors();

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

  setColorScheme(scheme: ColorScheme) {
    let applicationColors = defaultApplicationColors;

    if (scheme === 'classic') {
      applicationColors = classicApplicationColors;
    } else if (scheme === 'dark') {
      applicationColors = darkApplicationColors;
    } else if (scheme === 'blue') {
      applicationColors = blueApplicationColors;
    }

    let settingId: keyof ApplicationColorSettings;
    // eslint-disable-next-line guard-for-in, no-restricted-syntax
    for (settingId in applicationColors) {
      const setting = this.applicationSettings[settingId];
      setting.value = applicationColors[settingId];
    }

    this.notifyPropertyChange('applicationSettings');

    this.saveSettings();
  }

  updateColors() {
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
