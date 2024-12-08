import Helper from '@ember/component/helper';
import { addListener, removeListener } from '@ember/object/events';

export default class AddListenerHelper extends Helper {
  removeListener: any;

  /**
   * Helper to make use of the ember event API
   * @param pub Object which emits an event
   * @param eventName Identifier (string) of the emitted event
   * @param callback Function to be called when event is emitted
   * @returns
   */
  compute([pub, eventName, callback]: any) {
    if (!pub || !eventName || !callback) {
      return;
    }

    // Avoid duplicate subscription to events
    this.removeExistingListener();

    addListener(pub, eventName, callback);

    // Enable later removal of listener
    this.removeListener = () => removeListener(pub, eventName, callback);
  }

  willDestroy() {
    this.removeExistingListener();
    super.willDestroy();
  }

  removeExistingListener() {
    if (this.removeListener) {
      this.removeListener();
      this.removeListener = null;
    }
  }
}
