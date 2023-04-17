// @ts-nocheck
import * as THREE from 'three';
import UserSettings from './user-settings';
import {
  ApplicationColorSettingId,
  LandscapeColorSettingId,
} from '../utils/settings/settings-schemas';

export type LandscapeColors = Record<LandscapeColorSettingId, THREE.Color>;

export type ApplicationColors = Record<ApplicationColorSettingId, THREE.Color>;

/**
 * The Configuration Service handles color settings for the
 * visualization and configuration extensions
 * @class Configuration-Service
 * @extends Ember.Service
 */
export default class Configuration {
  userSettings!: UserSettings;

  /**
   * Colors for landscape visualization
   *
   * @property landscapeColors
   * @type LandscapeColors
   */
  landscapeColors!: LandscapeColors;

  /**
   * Colors for application visualization
   *
   * @property applicationColors
   * @type ApplicationColors
   */
  applicationColors!: ApplicationColors;

  // #region APPLICATION LAYOUT

  isCommRendered = true;

  commCurveHeightDependsOnDistance = true;

  // Determines height of class communication curves, 0 results in straight lines
  commCurveHeightMultiplier = 1;

  commWidthMultiplier = 1;

  popupPosition: { x: number; y: number } | undefined = undefined;

  // #endregion APPLICATION LAYOUT

  /**
   * Sets default colors
   */
  constructor() {
    const { landscapeSettings, applicationSettings } = this.userSettings;

    this.landscapeColors = {
      nodeColor: new THREE.Color(landscapeSettings.nodeColor.value),
      applicationColor: new THREE.Color(
        landscapeSettings.applicationColor.value
      ),
      communicationColor: new THREE.Color(
        landscapeSettings.communicationColor.value
      ),
      nodeTextColor: new THREE.Color(landscapeSettings.nodeTextColor.value),
      applicationTextColor: new THREE.Color(
        landscapeSettings.applicationTextColor.value
      ),
      backgroundColor: new THREE.Color(landscapeSettings.backgroundColor.value),
    };

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
