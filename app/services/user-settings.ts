import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import {
  classicColors,
  ColorSchemeId,
  darkColors,
  defaultColors,
  blueColors,
  ColorScheme,
} from 'explorviz-frontend/utils/settings/color-schemes';
import { defaultVizSettings } from 'explorviz-frontend/utils/settings/default-settings';
import {
  ColorSettingId,
  ColorSettings,
  VisualizationSettingId,
  VisualizationSettings,
  isColorSetting,
  isFlagSetting,
  isRangeSetting,
} from 'explorviz-frontend/utils/settings/settings-schemas';
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
  validateRangeSetting,
} from 'explorviz-frontend/utils/settings/local-storage-settings';

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

  @tracked
  visualizationSettings!: VisualizationSettings;

  /**
   * Colors for visualization
   *
   * @property colors
   * @type ExplorVizColors
   */
  @tracked
  colors!: ExplorVizColors;

  constructor() {
    super(...arguments);

    this.visualizationSettings = getStoredSettings();
    this.setColorsFromSettings();
    this.updateColors();
  }

  applyDefaultSettingsForGroup(groupId: string) {
    const defaultSettings = JSON.parse(JSON.stringify(defaultVizSettings));
    let settingId: keyof VisualizationSettings;
    for (settingId in this.visualizationSettings) {
      const setting = this.visualizationSettings[settingId];
      if (setting.group === groupId) {
        this.visualizationSettings[settingId] = defaultSettings[settingId];
      }
    }
    this.notifyPropertyChange('visualizationSettings');
    saveSettings(this.visualizationSettings);
  }

  @action
  applyDefaultSettings(saveToLocalStorage = true) {
    this.visualizationSettings = JSON.parse(JSON.stringify(defaultVizSettings));

    this.updateColors();

    if (saveToLocalStorage) {
      saveSettings(this.visualizationSettings);
    }
  }

  shareSettings() {
    this.sender.sendSharedSettings(this.visualizationSettings);
  }

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
    const setting = this.visualizationSettings[name];

    const newValue = value ?? defaultVizSettings[name].value;

    if (isRangeSetting(setting) && typeof newValue === 'number') {
      validateRangeSetting(setting, newValue);
      this.visualizationSettings = {
        ...this.visualizationSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
    } else if (isFlagSetting(setting) && typeof newValue === 'boolean') {
      this.visualizationSettings = {
        ...this.visualizationSettings,
        [name]: { ...JSON.parse(JSON.stringify(setting)), value: newValue },
      };
    } else if (isColorSetting(setting) && typeof newValue === 'string') {
      setting.value = newValue;
    }

    saveSettings(this.visualizationSettings);
  }

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

    updateColors(this.sceneRepo.getScene(), this.colors);
  }

  setColorsFromSettings() {
    const { visualizationSettings } = this;

    this.colors = {
      foundationColor: new THREE.Color(
        visualizationSettings.foundationColor.value
      ),
      componentOddColor: new THREE.Color(
        visualizationSettings.componentOddColor.value
      ),
      componentEvenColor: new THREE.Color(
        visualizationSettings.componentEvenColor.value
      ),
      clazzColor: new THREE.Color(visualizationSettings.clazzColor.value),
      highlightedEntityColor: new THREE.Color(
        visualizationSettings.highlightedEntityColor.value
      ),
      componentTextColor: new THREE.Color(
        visualizationSettings.componentTextColor.value
      ),
      clazzTextColor: new THREE.Color(
        visualizationSettings.clazzTextColor.value
      ),
      foundationTextColor: new THREE.Color(
        visualizationSettings.foundationTextColor.value
      ),
      communicationColor: new THREE.Color(
        visualizationSettings.communicationColor.value
      ),
      communicationArrowColor: new THREE.Color(
        visualizationSettings.communicationArrowColor.value
      ),
      backgroundColor: new THREE.Color(
        visualizationSettings.backgroundColor.value
      ),
      k8sNodeColor: new THREE.Color(visualizationSettings.k8sNodeColor.value),
      k8sNamespaceColor: new THREE.Color(
        visualizationSettings.k8sNamespaceColor.value
      ),
      k8sDeploymentColor: new THREE.Color(
        visualizationSettings.k8sDeploymentColor.value
      ),
      k8sPodColor: new THREE.Color(visualizationSettings.k8sPodColor.value),
      k8sTextColor: new THREE.Color(visualizationSettings.k8sTextColor.value),
    };
  }
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'user-settings': UserSettings;
  }
}
