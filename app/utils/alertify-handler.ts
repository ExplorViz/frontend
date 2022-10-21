import $ from 'jquery';
// @ts-ignore: no types atm
import alertify from 'alertifyjs';

type AlertifyPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * @class AlertifyHandler
 *
 * @module explorviz
 */
export default class AlertifyHandler {
  static alertActive = false;

  /**
   * Displays the given message with an error design for 5 seconds.
   *
   * @param message Text which is to be displayed
   */
  static showAlertifyError(message: string) {
    this.showAlertifyMessageWithDuration(message, 5, 'error');
  }

  /**
   * Displays the given message with a warning design for 3 seconds.
   *
   * @param message Text which is to be displayed
   */
  static showAlertifyWarning(message: string) {
    this.showAlertifyMessageWithDuration(message, 3, 'warning');
  }

  /**
   * Displays the given message with a success design for 3 seconds.
   *
   * @param message Text which is to be displayed
   */
  static showAlertifySuccess(message: string) {
    this.showAlertifyMessageWithDuration(message, 3, 'success');
  }

  /**
   * Displays the given message for 3 seconds.
   *
   * @param message Text which is to be displayed
   */
  static showAlertifyMessage(message: string) {
    this.showAlertifyMessageWithDuration(message, 3);
  }

  /**
   * Displays a message with the given text for the specified duration.
   * Appearance can be customized with a cssClass identifier.
   *
   * @param message Text which is to be displayed
   * @param duration Duration in seconds for which the message should be displayed
   * @param cssClass Name of a CSS class which determines the appearance of the message
   */
  static showAlertifyMessageWithDuration(
    message: string,
    duration: number,
    cssClass: string = 'message'
  ) {
    this.alertActive = true;

    alertify.notify(message, cssClass, duration, () => {
      // If last dialog, set respective flag
      // This flag is not used atm, but may be used in the future
      if ($('.ajs-message.ajs-message.ajs-visible').length === 0) {
        this.alertActive = false;
      }
    });
  }

  /**
   * Stops the displaying of all currently added messages
   */
  static closeAlertifyMessages() {
    alertify.dismissAll();

    this.alertActive = false;
  }

  /**
   * Set the position for notifications which are handled by AlertifyJS.
   * 'bottom-right' is set by default.
   *
   * @param position Defines the position on the screen where notifications are displayed
   */
  static setAlertifyPosition(position: AlertifyPosition) {
    alertify.set('notifier', 'position', position);
  }
}
