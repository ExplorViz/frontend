import Service from '@ember/service';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

export default class ToastMessage extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  info!: (message: string) => void;
  success!: (message: string) => void;
  error!: (message: string) => void;

  init() {
    super.init();
    this.info = (message => AlertifyHandler.showAlertifyMessage(message));
    this.success = (message => AlertifyHandler.showAlertifySuccess(message));
    this.error = (message => AlertifyHandler.showAlertifyError(message));
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'toast-message': ToastMessage;
  }
}
