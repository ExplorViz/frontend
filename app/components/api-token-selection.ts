import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import { ApiToken } from 'explorviz-frontend/services/user-api-token';
import { format } from 'date-fns';

export default class ApiTokenSelectionComponent extends Component<ApiToken> {
  today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

  @service
  auth!: Auth;

  @tracked
  sortProperty: keyof ApiToken = 'name';

  @tracked
  sortOrder: 'asc' | 'desc' = 'asc';

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

  /*
   * TODO: deleteApiTOken from DB
   * @param apiToken
   */
  @action
  deleteApiToken(apiToken: string) {
    // give db uID wiht auth.user.user_id or if not auth ("johnny", than the hardcoded uId)
    console.log(apiToken);
  }

  @action
  openMenu() {
    this.createToken = true;
  }

  @action
  closeMenu() {
    this.createToken = false;
  }

  @action
  createApiToken() {
    // hier noch Toasthandler für success und so
    const createdAt: number = new Date().getTime();
    console.log(
      'Create API-Token with:' +
        this.name +
        ', ' +
        this.token +
        ', ' +
        createdAt +
        ', ' +
        this.expDate
    );
    this.reset();
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
}
