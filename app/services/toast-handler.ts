import Service from '@ember/service';
import Evented from '@ember/object/evented';

export default class ToastHandlerService extends Service.extend(Evented) {
  showInfoToastMessage(message: string, header: string = '') {
    this.trigger('newToastMessage', 'info', message, header);
  }

  showSuccessToastMessage(message: string, header: string = '') {
    this.trigger('newToastMessage', 'success', message, header);
  }

  showErrorToastMessage(message: string, header: string = '') {
    this.trigger('newToastMessage', 'error', message, header);
  }
}

declare module '@ember/service' {
  interface Registry {
    'toast-handler': ToastHandlerService;
  }
}
