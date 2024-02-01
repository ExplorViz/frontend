/* eslint-disable no-self-assign */
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';

export default class PageSetupToastMessageComponent extends Component {
  @service('toastHandler')
  toastHandlerService!: ToastHandlerService;

  @tracked
  toastMessages: { htmlId: string; message: string }[] = [];

  private showToastCallback: any;

  constructor(owner: any, args: any) {
    super(owner, args);
    this.showToastCallback = this.addToastMessage.bind(this);
    this.toastHandlerService.on('newToastMessage', this.showToastCallback);
  }

  private addToastMessage(header: string, message: string) {
    const htmlIdUnique = 'toast-' + this.uuidv4();
    this.toastMessages.pushObject({ htmlId: htmlIdUnique, message });
  }

  private uuidv4(): string {
    // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  @action
  toastRenderIsComplete(htmlElement: HTMLElement) {
    const id = htmlElement.id;
    const toast: any = $(`#${id}`);
    if (toast) {
      toast.toast('show');
      toast.on('hidden.bs.toast', () => {
        this.toastMessages.splice(
          this.toastMessages.findIndex((item) => item.htmlId === id),
          1
        );
      });
    }
  }
}
