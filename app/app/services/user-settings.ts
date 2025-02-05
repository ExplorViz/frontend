import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import {
  classicColors,
  ColorSchemeId,
  darkColors,
  defaultColors,
  blueColors,
  ColorScheme,
} from 'react-lib/src/utils/settings/color-schemes';
import { defaultVizSettings } from 'react-lib/src/utils/settings/default-settings';
import {
  ColorSettingId,
  ColorSettings,
  VisualizationSettingId,
  VisualizationSettings,
} from 'react-lib/src/utils/settings/settings-schemas';
import * as THREE from 'three';
import { updateColors } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
// import SceneRepository from './repos/scene-repository';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
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

  // @service('repos/scene-repository')
  // sceneRepo!: SceneRepository;

  @service('collaboration/message-sender')
  private sender!: MessageSender;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  // @tracked
  // applicationSettings!: VisualizationSettings;
  get visualizationSettings(): VisualizationSettings {
    return useUserSettingsStore.getState().visualizationSettings;
  }

  set visualizationSettings(value: VisualizationSettings) {
    useUserSettingsStore.setState({ visualizationSettings: value });
  }

  /**
   * Colors for application visualization
   *
   * @property applicationColors
   * @type ApplicationColors
   */
  // @tracked
  // applicationColors!: ApplicationColors;
  get colors(): ApplicationColors | undefined {
    return useUserSettingsStore.getState().colors;
  }

  set colors(value: ApplicationColors) {
    useUserSettingsStore.setState({ colors: value });
  }

  constructor() {
    super(...arguments);

    this.visualizationSettings = getStoredSettings();
    this.setColorsFromSettings();
    this.updateColors();
  }

  // TODO: Wait for corresponding service to be fully migrated
  //        updateColors uses not migrated service
  @action
  applyDefaultVisualizationSettings(saveToLocalStorage = true) {
    this.visualizationSettings = JSON.parse(JSON.stringify(defaultVizSettings));

    this.updateColors();

    if (saveToLocalStorage) {
      saveSettings(this.visualizationSettings);
    }
  }

  // TODO: Wait for corresponding service to be fully migrated
  shareVisualizationSettings() {
    this.sender.sendSharedSettings(this.visualizationSettings);
  }

  // TODO: Wait for corresponding service to be fully migrated
  updateSettings(settings: VisualizationSettings) {
    this.visualizationSettings = settings;

    this.updateColors();
    this.applicationRenderer.addCommunicationForAllApplications();
    this.highlightingService.updateHighlighting();
    this.localUser.defaultCamera.fov =
      this.visualizationSettings.cameraFov.value;
    this.localUser.defaultCamera.updateProjectionMatrix();
  }

  updateSetting(name: VisualizationSettingId, value?: unknown) {
    useUserSettingsStore.getState().updateSetting(name, value);

    // const setting = this.applicationSettings[name];

    // const newValue = value ?? defaultVizSettings[name].value;

    // if (isRangeSetting(setting) && typeof newValue === 'number') {
    //   validateRangeSetting(setting, newValue);
    //   this.applicationSettings = {
    //     ...this.applicationSettings,
    //     [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
    //   };
    // } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
    //   this.applicationSettings = {
    //     ...this.applicationSettings,
    //     [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
    //   };
    // } else if (isColorSetting(setting) && typeof newValue === 'string') {
    //   setting.value = newValue;
    // }

    // saveSettings(this.applicationSettings);
  }

  // TODO: Wait for corresponding service to be fully migrated
  //        updateColors uses not migrated service
  setColorScheme(schemeId: ColorSchemeId, saveToLocalStorage = true) {
    let scheme = defaultColors;

    switch (schemeId) {
      case 'classic':
        scheme = classicColors;
        break;
      case 'blue':
        scheme = blueColors;
        break;
      case 'dark':
        scheme = darkColors;
        break;
      default:
        break;
    }

    let settingId: keyof ColorSettings;
    for (settingId in this.colors) {
      this.visualizationSettings[settingId].value = scheme[settingId];
    }

    this.updateColors(scheme);

    if (saveToLocalStorage) {
      saveSettings(this.visualizationSettings);
    }
  }

  // TODO: Wait for corresponding services and utils to be migrated
  updateColors(updatedColors?: ColorScheme) {
    if (!this.colors) {
      this.setColorsFromSettings();
      return;
    }

    let settingId: keyof ColorSettings;
    for (settingId in this.colors) {
      if (updatedColors) {
        this.colors[settingId].set(updatedColors[settingId]);
      } else {
        this.colors[settingId].set(this.visualizationSettings[settingId].value);
      }
    }

    updateColors(
      useSceneRepositoryStore.getState().getScene('browser', false),
      this.colors
    );
  }

  setColorsFromSettings() {
    useUserSettingsStore.getState().setColorsFromSettings();

    // const applicationSettings = this.applicationSettings;

    // this.applicationColors = {
    //   foundationColor: new THREE.Color(
    //     applicationSettings.foundationColor.value
    //   ),
    //   componentOddColor: new THREE.Color(
    //     applicationSettings.componentOddColor.value
    //   ),
    //   componentEvenColor: new THREE.Color(
    //     applicationSettings.componentEvenColor.value
    //   ),
    //   clazzColor: new THREE.Color(applicationSettings.clazzColor.value),
    //   highlightedEntityColor: new THREE.Color(
    //     applicationSettings.highlightedEntityColor.value
    //   ),
    //   componentTextColor: new THREE.Color(
    //     applicationSettings.componentTextColor.value
    //   ),
    //   clazzTextColor: new THREE.Color(applicationSettings.clazzTextColor.value),
    //   foundationTextColor: new THREE.Color(
    //     applicationSettings.foundationTextColor.value
    //   ),
    //   communicationColor: new THREE.Color(
    //     applicationSettings.communicationColor.value
    //   ),
    //   communicationArrowColor: new THREE.Color(
    //     applicationSettings.communicationArrowColor.value
    //   ),
    //   backgroundColor: new THREE.Color(
    //     applicationSettings.backgroundColor.value
    //   ),
    // };
  }
}

export type ApplicationColors = Record<ColorSettingId, THREE.Color>;

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
