import AlertifyHandler from '../utils/alertify-handler';

export interface MessageArgs {
  title: string;
  text: string;
  color: string;
  time: number;
}

export default class ToastMessage {
  info!: (message: string) => void;

  message!: (message: MessageArgs) => void;

  success!: (message: string) => void;

  error!: (message: string) => void;

  init() {
    this.info = (message) => AlertifyHandler.showAlertifyMessage(message);
    this.message = (message) =>
      AlertifyHandler.showAlertifyMessageWithDuration(
        `${message.title}: ${message.text}`,
        message.time
      );
    this.success = (message) => AlertifyHandler.showAlertifySuccess(message);
    this.error = (message) => AlertifyHandler.showAlertifyError(message);
  }
}
