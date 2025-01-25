import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

export default class ToastHandlerService extends Service.extend(Evented) {
  // showInfoToastMessage(message: string, header: string = '') {
  //   this.trigger('newToastMessage', 'info', message, header);
  // }
  showInfoToastMessage(message: string, header: string = '') {
    useToastHandlerStore.getState().showInfoToastMessage(message, header);
  }

  // showSuccessToastMessage(message: string, header: string = '') {
  //   this.trigger('newToastMessage', 'success', message, header);
  // }
  showSuccessToastMessage(message: string, header: string = '') {
    useToastHandlerStore.getState().showSuccessToastMessage(message, header);
  }

  // showErrorToastMessage(message: string, header: string = '') {
  //   this.trigger('newToastMessage', 'error', message, header);
  // }
  showErrorToastMessage(message: string, header: string = '') {
    useToastHandlerStore.getState().showErrorToastMessage(message, header);
  }
}

declare module '@ember/service' {
  interface Registry {
    'toast-handler': ToastHandlerService;
  }
}
