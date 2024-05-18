import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import UserApiTokenService, {
  ApiToken,
} from 'explorviz-frontend/services/user-api-token';
import { format } from 'date-fns';

export default class ApiTokenSelectionComponent extends Component<ApiToken> {
  today: string = format(new Date().getTime() + 86400 * 1000, 'yyyy-MM-dd');

  @service('user-api-token')
  userApiTokenService!: UserApiTokenService;

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
    this.userApiTokenService.deleteApiToken(apiToken, uId);
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

  @action
  async createApiToken() {
    this.userApiTokenService.createApiToken(
      this.name,
      this.token,
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

  formatDate(date: number, showMin: boolean): string {
    if (date === 0) {
      return '-';
    } else if (showMin) {
      return format(new Date(date), 'dd/MM/yyyy, HH:mm');
    } else return format(new Date(date), 'dd/MM/yyyy');
  }
}
