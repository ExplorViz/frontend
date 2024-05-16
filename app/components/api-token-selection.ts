import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import { ApiToken } from 'explorviz-frontend/services/user-api-token';
import { format } from 'date-fns';
import ENV from 'explorviz-frontend/config/environment';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';

const { userServiceApi } = ENV.backendAddresses;

export default class ApiTokenSelectionComponent extends Component<ApiToken> {
  today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

  @service('auth')
  auth!: Auth;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

  @service('router')
  router!: any;

  @tracked
  sortProperty: keyof ApiToken = 'createdAt';

  @tracked
  sortOrder: 'asc' | 'desc' = 'desc';

  @tracked
  createToken: boolean = false;

  @tracked
  name: string = '';

  @tracked
  expDate: number | null = null;

  @tracked
  token: string = '';

  @tracked
  saveBtnDisabled: boolean = true;

  /**
   * Converts a string to a number as date
   * @param date has format `yyyy-MM-dd`
   * @returns
   */
  @action
  convertDate(date: string) {
    const day = date.slice(8, date.length);
    const month = date.slice(5, 7);
    const year = date.slice(0, 4);

    return new Date(
      Date.UTC(Number(year), Number(month), Number(day))
    ).valueOf();
  }

  @action
  sortBy(property: keyof ApiToken) {
    if (property === this.sortProperty) {
      if (this.sortOrder === 'asc') {
        this.sortOrder = 'desc';
      } else {
        this.sortOrder = 'asc';
      }
    } else {
      this.sortOrder = 'asc';
      this.sortProperty = property;
    }
  }

  @action
  async deleteApiToken(apiToken: string, uId: string) {
    const url = `${userServiceApi}/userapi/delete?uId=${uId}&token=${apiToken}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (response.ok) {
      this.toastHandler.showSuccessToastMessage(
        'API-Token successfully deleted.'
      );
    } else {
      this.toastHandler.showErrorToastMessage(
        'Something went wrong. API-Token could not be deleted.'
      );
    }

    this.router.refresh('settings');
  }

  @action
  openMenu() {
    this.createToken = true;
  }

  @action
  closeMenu() {
    this.reset();
    this.createToken = false;
  }
  /**
   * TODO: Toasthandler hinzufügen mit success, failed etc.
   * TODO: Verschiedene Stati beachten
   */
  @action
  async createApiToken() {
    const createdAt: number = new Date().getTime();

    const url =
      this.expDate !== null
        ? `${userServiceApi}/userapi/create?uId=${this.auth.user!.sub}&name=${this.name}&token=${this.token}&createdAt=${createdAt}&expires=${this.expDate}`
        : `${userServiceApi}/userapi/create?uId=${this.auth.user!.sub}&name=${this.name}&token=${this.token}&createdAt=${createdAt}`;
    const response = await fetch(url, {
      method: 'POST',
    });
    if (response.ok) {
      this.toastHandler.showSuccessToastMessage(
        'API-Token successfully saved.'
      );
    } else if (response.status === 422) {
      this.toastHandler.showErrorToastMessage('Token is already being used.');
    } else {
      this.toastHandler.showErrorToastMessage(
        'Something went wrong. API-Token could not be saved.'
      );
    }
    this.reset();
    this.router.refresh('settings');
  }

  @action
  reset() {
    this.name = '';
    this.expDate = null;
    this.token = '';
    this.createToken = false;
  }

  @action
  updateName(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.name = target.value;
    this.canSaveToken();
  }

  @action
  updateToken(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.token = target.value;
    this.canSaveToken();
  }

  @action
  updateExpDate(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = this.convertDate(target.value);
    this.expDate = date;
  }

  @action
  canSaveToken() {
    if (this.token !== '' && this.name !== '') {
      this.saveBtnDisabled = false;
    } else {
      this.saveBtnDisabled = true;
    }
  }

  formatDate(date: number, showMin: boolean): string {
    if (date === 0) {
      return '-';
    } else if (showMin) {
      return format(new Date(date), 'dd/MM/yyyy, HH:mm');
    } else return format(new Date(date), 'dd/MM/yyyy');
  }
}
