import Service from '@ember/service';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { inject as service } from '@ember/service';

export interface MessageArgs {
  title: string;
  text: string;
  color: string;
  time: number;
}

export default class ToastMessage extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  // These functions can be overriden by vr-rendering to enable WebGL-based messages

  @service('toastHandler')
  toastHandlerService!: ToastHandlerService;

  info!: (message: string) => void;

  message!: (message: MessageArgs) => void;

  success!: (message: string) => void;

  error!: (message: string) => void;

  init() {
    super.init();
    this.info = (message) =>
      this.toastHandlerService.showInfoToastMessage(message);
    this.message = (message) =>
      this.toastHandlerService.showInfoToastMessage(
        `${message.title}: ${message.text}`
      );
    this.success = (message) =>
      this.toastHandlerService.showSuccessToastMessage(message);
    this.error = (message) =>
      this.toastHandlerService.showErrorToastMessage(message);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'toast-message': ToastMessage;
  }
}
