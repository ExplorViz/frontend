import Component from '@glimmer/component';
import { action } from '@ember/object';
import ArSettings from 'virtual-reality/services/ar-settings';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import Configuration from 'explorviz-frontend/services/configuration';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

interface ArSettingsSelectorArgs {
  removeComponent(componentPath: string): void
  updateCameraResolution(width: number, height: number): void
  updateRendererResolution(multiplier: number): void
}

export default class ArSettingsSelector extends Component<ArSettingsSelectorArgs> {
  @service('ar-settings')
  arSettings!: ArSettings;

  @service('configuration')
  configuration!: Configuration;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @tracked
  buttonSize: number;

  @tracked
  buttonPadding: number;

  cameraPresets = [
    { name: '640 x 480', width: 640, height: 480 },
    { name: '1280 x 720', width: 1280, height: 720 },
    { name: '1920 x 1080', width: 1920, height: 1080 },
  ];

  renderResolutions = [
    { name: 'default', multiplier: 2 },
    { name: 'low', multiplier: 1 },
    { name: 'very low', multiplier: 0.5 },
  ];

  constructor(owner: any, args: ArSettingsSelectorArgs) {
    super(owner, args);

    this.buttonSize = ArSettingsSelector.getCssVminSize('--ar-button-size');
    this.buttonPadding = ArSettingsSelector.getCssVminSize('--ar-button-padding');
  }

  @action
  close() {
    this.args.removeComponent('ar-settings-selector');
  }

  @action
  updateZoomLevel(event: any) {
    this.arSettings.zoomLevel = Number.parseFloat(event.target.value);
  }

  @action
  updateCommunicationWidth(event: any) {
    this.configuration.commWidthMultiplier = Number.parseFloat(event.target.value);
    this.applicationRenderer.updateCommunication();
  }

  @action
  updateCommunicationHeight(event: any) {
    this.configuration.commCurveHeightMultiplier = Number.parseFloat(event.target.value);
    this.applicationRenderer.updateCommunication();
  }

  @action
  updateCameraResoltion(width: number, height: number) {
    this.args.updateCameraResolution(width, height);
  }

  @action
  updateRendererResoltion(multiplier: number) {
    this.args.updateRendererResolution(multiplier);
  }

  @action
  toggleApplicationDependsOnDistance() {
    const oldValue = this.configuration.commCurveHeightDependsOnDistance;
    this.configuration.commCurveHeightDependsOnDistance = !oldValue;

    this.applicationRenderer.updateCommunication();
  }

  @action
  toggleRenderClassCommunication() {
    const oldValue = this.arSettings.renderCommunication;
    this.arSettings.renderCommunication = !oldValue;

    this.applicationRenderer.updateCommunication();
  }

  @action
  updateApplicationOpacity(event: any) {
    this.arSettings.setApplicationOpacity(event.target.value);
  }

  @action
  updateButtonSize(event: any) {
    const size = event.target.value;
    this.buttonSize = size;

    ArSettingsSelector.setCssVariable('--ar-button-size', `${size}vmin`);
  }

  @action
  updateButtonSpacing(event: any) {
    const padding = event.target.value;
    this.buttonPadding = padding;

    ArSettingsSelector.setCssVariable('--ar-button-padding', `${padding}vmin`);
  }

  static setCssVariable(variable: string, value: string) {
    const root = document.querySelector(':root');
    if (root) {
      (<HTMLElement>root).style.setProperty(variable, value);
    }
  }

  static getCssVminSize(variable: string) {
    const root = document.querySelector(':root')!;

    const cssString = getComputedStyle(root).getPropertyValue(variable);
    const cssValue = Number.parseFloat(cssString.replace('vmin', ''));

    return cssValue;
  }
}
