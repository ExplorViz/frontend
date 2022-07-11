import Service from '@ember/service';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

export interface MessageArgs {
  title: string,
  text: string,
  color: string,
  time: number,
}

export default class ToastMessage extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  info!: (message: string) => void;

  message!: (message: MessageArgs) => void;

  success!: (message: string) => void;

  error!: (message: string) => void;

  init() {
    super.init();
    this.info = ((message) => AlertifyHandler.showAlertifyMessage(message));
    this.message = ((message) => AlertifyHandler.showAlertifyMessageWithDuration(`${message.title}: ${message.text}`, message.time));
    this.success = ((message) => AlertifyHandler.showAlertifySuccess(message));
    this.error = ((message) => AlertifyHandler.showAlertifyError(message));
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'toast-message': ToastMessage;
  }
}
