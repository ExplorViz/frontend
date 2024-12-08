import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import UserApiTokenService, {
  ApiToken,
} from 'explorviz-frontend/services/user-api-token';
import { format } from 'date-fns';
import convertDate from 'explorviz-frontend/utils/helpers/time-convter';

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
  hostUrl: string = '';

  @tracked
  saveBtnDisabled: boolean = true;

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
  async deleteApiToken(apiToken: ApiToken) {
    await this.userApiTokenService.deleteApiToken(apiToken.token, apiToken.uid);
    if (localStorage.getItem('gitAPIToken') !== null) {
      if (localStorage.getItem('gitAPIToken') === JSON.stringify(apiToken)) {
        localStorage.removeItem('gitAPIToken');
        localStorage.removeItem('gitProject');
      }
    }
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
      this.hostUrl,
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
    this.hostUrl = '';
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
  updateHostUrl(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.hostUrl = target.value;
    this.canSaveToken();
  }

  @action
  updateExpDate(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    this.expDate = date;
  }

  @action
  canSaveToken() {
    if (this.token !== '' && this.name !== '' && this.hostUrl !== '') {
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
