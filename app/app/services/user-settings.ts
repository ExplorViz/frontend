import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import {
  classicApplicationColors,
  ColorSchemeId,
  darkApplicationColors,
  defaultApplicationColors,
  blueApplicationColors,
  ColorScheme,
} from 'react-lib/src/utils/settings/color-schemes';
import { defaultApplicationSettings } from 'react-lib/src/utils/settings/default-settings';
import {
  ApplicationColorSettingId,
  ApplicationColorSettings,
  ApplicationSettingId,
  ApplicationSettings,
} from 'react-lib/src/utils/settings/settings-schemas';
import * as THREE from 'three';
import { updateColors } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import SceneRepository from './repos/scene-repository';
import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import HighlightingService from './highlighting-service';
import ApplicationRenderer from './application-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import {
  getStoredSettings,
  saveSettings,
} from 'react-lib/src/utils/settings/local-storage-settings';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';

export default class UserSettings extends Service {
  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  // @tracked
  // applicationSettings!: ApplicationSettings;
  get applicationSettings(): ApplicationSettings {
    return useUserSettingsStore.getState().applicationSettings;
  }

  set applicationSettings(value: ApplicationSettings) {
    useUserSettingsStore.setState({ applicationSettings: value });
  }

  /**
   * Colors for application visualization
   *
   * @property applicationColors
   * @type ApplicationColors
   */
  // @tracked
  // applicationColors!: ApplicationColors;
  get applicationColors(): ApplicationColors | undefined {
    return useUserSettingsStore.getState().applicationColors;
  }

  set applicationColors(value: ApplicationColors) {
    useUserSettingsStore.setState({ applicationColors: value });
  }

  constructor() {
    super(...arguments);

    this.applicationSettings = getStoredSettings();
    this.setColorsFromSettings();
    this.updateColors();
  }

  // TODO: Wait for corresponding service to be fully migrated
  //        updateColors uses not migrated service
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

  // TODO: Wait for corresponding service to be fully migrated
  shareApplicationSettings() {
    this.sender.sendSharedSettings(this.applicationSettings);
  }

  // TODO: Wait for corresponding service to be fully migrated
  updateSettings(settings: ApplicationSettings) {
    this.applicationSettings = settings;

    this.updateColors();
    this.applicationRenderer.addCommunicationForAllApplications();
    this.highlightingService.updateHighlighting();
    this.localUser.defaultCamera.fov = this.applicationSettings.cameraFov.value;
    this.localUser.defaultCamera.updateProjectionMatrix();
  }

  updateApplicationSetting(name: ApplicationSettingId, value?: unknown) {
    useUserSettingsStore.getState().updateApplicationSetting(name, value);
  }

  // TODO: Wait for corresponding service to be fully migrated
  //        updateColors uses not migrated service
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

  // TODO: Wait for corresponding services and utils to be migrated
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
    useUserSettingsStore.getState().setColorsFromSettings();
  }
}

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
