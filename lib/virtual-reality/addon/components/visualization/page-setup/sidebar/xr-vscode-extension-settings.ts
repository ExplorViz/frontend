import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import {
  emitToBackend,
  IDEApiActions,
  IDEApiDest,
  monitoringMockup,
  restartAndSetSocket,
} from 'explorviz-frontend/services/ide-api';

interface XrVscodeExtensionSettingsArgs {
  removeComponent(componentPath: string): void;
}

export default class ArSettingsSelector extends Component<XrVscodeExtensionSettingsArgs> {
  // @service('collaboration')
  private backendHTTP!: string;

  constructor(owner: any, args: XrVscodeExtensionSettingsArgs) {
    super(owner, args);

    this.loadIDESettings(false);
  }

  @action
  close() {
    this.args.removeComponent('xr-vscode-extension-settings');
  }

  @action
  async loadIDESettings(alert = true) {
    this.backendHTTP = 'http://localhost:3000';
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
