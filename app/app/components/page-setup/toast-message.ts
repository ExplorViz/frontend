/* eslint-disable no-self-assign */
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import generateUuidv4 from 'react-lib/src/utils/helpers/uuid4-generator';
import eventEmitter from 'react-lib/src/utils/event-emitter';

export default class PageSetupToastMessageComponent extends Component {
  @tracked
  private toastMessages: {
    htmlId: string;
    header: string;
    message: string;
    cssClasses: string;
  }[] = [];

  private showToastCallback: any;

  private cssClassesValues: [string, string][] = [
    ['info', 'bg-info text-white'],
    ['error', 'bg-danger text-white'],
    ['success', 'bg-success text-white'],
  ];

  private cssClasses: Map<string, string> = new Map(this.cssClassesValues);

  constructor(owner: any, args: any) {
    super(owner, args);
    this.showToastCallback = this.addToastMessage.bind(this);
    // this.toastHandlerService.on('newToastMessage', this.showToastCallback);
    eventEmitter.on('newToastMessage', this.showToastCallback);
  }

  private addToastMessage(type: string, message: string, header: string) {
    const htmlIdUnique = 'toast-' + generateUuidv4();

    let cssClasses = this.cssClasses.get(type);

    if (!cssClasses) {
      cssClasses = '';
    }

    this.toastMessages.pushObject({
      htmlId: htmlIdUnique,
      header,
      message,
      cssClasses,
    });
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
