import Service from '@ember/service';
import Evented from '@ember/object/evented';

export default class ToastHandlerService extends Service.extend(Evented) {
  showToastMessage(header: string, message: string) {
    this.trigger('newToastMessage', header, message);
  }
}

declare module '@ember/service' {
  interface Registry {
    'toast-handler': ToastHandlerService;
  }
}
