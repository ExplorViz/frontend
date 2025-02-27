import Component from '@glimmer/component';
import { action } from '@ember/object';
import { sendMonitoringData } from 'explorviz-frontend/ide/ide-websocket';
import { inject as service } from '@ember/service';
import IdeWebsocketFacade from 'explorviz-frontend/services/ide-websocket-facade';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

export default class VscodeExtensionSettings extends Component {
  @service('ide-websocket-facade')
  ideWebsocketFacade!: IdeWebsocketFacade;

  constructor(owner: any, args: any) {
    super(owner, args);
  }

  @action
  // eslint-disable-next-line class-methods-use-this
  onRoomNameCopied() {
    useToastHandlerStore
      .getState()
      .showSuccessToastMessage('Room name copied to clipboard');
  }

  @action
  monitoring() {
    console.log('monitoring');

    const payload = {
      fqn: 'org.springframework.samples.petclinic.model.Person',
      description: 'Test by akr',
    };

    sendMonitoringData([payload]);
    useToastHandlerStore
      .getState()
      .showSuccessToastMessage('Show Monitoring mockup');
  }

  @action
  connectToIDE() {
    console.log('connectToIDE');
    useToastHandlerStore.getState().showInfoToastMessage('Connect to IDE');
    this.ideWebsocketFacade.restartConnection();
  }
}
