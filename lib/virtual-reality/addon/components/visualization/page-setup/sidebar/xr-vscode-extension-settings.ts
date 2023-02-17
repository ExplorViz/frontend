import Component from '@glimmer/component';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import {
  monitoringMockup,
  restartAndSetSocket,
} from 'explorviz-frontend/services/ide-api';
import ENV from 'explorviz-frontend/config/environment';

interface XrVscodeExtensionSettingsArgs {
  removeComponent(componentPath: string): void;
}

const { vsCodeService } = ENV.backendAddresses;

export default class ArSettingsSelector extends Component<XrVscodeExtensionSettingsArgs> {
  // @service('collaboration')
  private backendHTTP!: string;

  constructor(owner: any, args: XrVscodeExtensionSettingsArgs) {
    super(owner, args);

    this.loadIDESettings();
  }

  @action
  close() {
    this.args.removeComponent('xr-vscode-extension-settings');
  }

  @action
  async loadIDESettings() {
    this.backendHTTP = vsCodeService;
    AlertifyHandler.showAlertifySuccess('Loading IDE Settings');
  }

  @action
  monitoring() {
    console.log('monitoring');

    monitoringMockup();
    AlertifyHandler.showAlertifySuccess('Show Monitoring mockup');
  }

  @action
  connectToIDE() {
    console.log('connectToIDE');
    AlertifyHandler.showAlertifyMessage('Connect to IDE');
    restartAndSetSocket(this.backendHTTP);
  }
}
