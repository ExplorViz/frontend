import Component from '@glimmer/component';
import { action } from '@ember/object';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { sendMonitoringData } from 'explorviz-frontend/ide/ide-websocket';
//import ENV from 'explorviz-frontend/config/environment';
import { inject as service } from '@ember/service';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';

interface XrVscodeExtensionSettingsArgs {
  removeComponent(componentPath: string): void;
}

//const { vsCodeService } = ENV.backendAddresses;

export default class ArSettingsSelector extends Component<XrVscodeExtensionSettingsArgs> {
  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  // @service('collaboration')

  constructor(owner: any, args: XrVscodeExtensionSettingsArgs) {
    super(owner, args);

    //this.loadIDESettings();
  }

  @action
  close() {
    this.args.removeComponent('xr-vscode-extension-settings');
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  onRoomNameCopied() {
    AlertifyHandler.showAlertifySuccess('Room name copied to clipboard');
  }

  //@action
  //async loadIDESettings() {
  //this.backendHTTP = vsCodeService;
  //  AlertifyHandler.showAlertifySuccess('Loading IDE Settings');
  //}

  @action
  monitoring() {
    console.log('monitoring');

    const payload = {
      fqn: 'org.springframework.samples.petclinic.model.Person',
      description: 'Test by akr',
    };

    sendMonitoringData([payload]);
    AlertifyHandler.showAlertifySuccess('Show Monitoring mockup');
  }

  @action
  connectToIDE() {
    console.log('connectToIDE');
    AlertifyHandler.showAlertifyMessage('Connect to IDE');
    this.ideWebsocketFacade.restartConnection();
  }
}
