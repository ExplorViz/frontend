import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
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
} from 'explorviz-frontend/utils/settings/settings-schemas';
import * as THREE from 'three';
import { updateColors } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import SceneRepository from './repos/scene-repository';
import MessageSender from 'collaboration/services/message-sender';
import HighlightingService from './highlighting-service';
import ApplicationRenderer from './application-renderer';
import LocalUser from 'collaboration/services/local-user';
import {
  getStoredSettings,
  saveSettings,
  validateRangeSetting,
} from 'explorviz-frontend/utils/settings/local-storage-settings';

export default class UserSettings extends Service {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('local-user')
  private localUser!: LocalUser;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('message-sender')
  private sender!: MessageSender;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

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

    this.restoreApplicationSettings();
  }

  @action
  applyDefaultApplicationSettings(saveToLocalStorage = true) {
    this.applicationSettings = JSON.parse(
      JSON.stringify(defaultApplicationSettings)
    );

    this.updateColors();

    if (saveToLocalStorage) {
      saveSettings(this.applicationSettings);
    }
  }

  shareApplicationSettings() {
    this.sender.sendSharedSettings(this.applicationSettings);
  }

  updateSettings(settings: ApplicationSettings) {
    this.applicationSettings = settings;

    this.updateColors();
    this.applicationRenderer.addCommunicationForAllApplications();
    this.highlightingService.updateHighlighting();
    this.localUser.defaultCamera.fov = this.applicationSettings.cameraFov.value;
    this.localUser.defaultCamera.updateProjectionMatrix();
  }

  updateApplicationSetting(name: ApplicationSettingId, value?: unknown) {
    const setting = this.applicationSettings[name];

    const newValue = value ?? defaultApplicationSettings[name].value;

    if (isRangeSetting(setting) && typeof newValue === 'number') {
      validateRangeSetting(setting, newValue);
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

    saveSettings(this.applicationSettings);
  }

  restoreApplicationSettings() {
    this.applicationSettings = getStoredSettings();
    this.setColorsFromSettings();
    this.updateColors();
  }

  setColorScheme(schemeId: ColorSchemeId, saveToLocalStorage = true) {
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

    if (saveToLocalStorage) {
      saveSettings(this.applicationSettings);
    }
  }

  updateColors(updatedColors?: ColorScheme) {
    if (!this.applicationColors) {
      this.setColorsFromSettings();
      return;
    }

    let settingId: keyof ApplicationColorSettings;
    for (settingId in this.applicationColors) {
      if (updatedColors) {
        this.applicationColors[settingId].set(updatedColors[settingId]);
      } else {
        this.applicationColors[settingId].set(
          this.applicationSettings[settingId].value
        );
      }
    }

    updateColors(this.sceneRepo.getScene(), this.applicationColors);
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
}

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
