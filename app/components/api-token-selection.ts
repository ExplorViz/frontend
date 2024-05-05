import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import { tracked } from '@glimmer/tracking';
import { ApiToken } from 'explorviz-frontend/services/user-api-token';

export default class ApiTokenSelectionComponent extends Component<ApiToken> {
  @service
  auth!: Auth;

  @tracked
  sortProperty: keyof ApiToken = 'name';

  @tracked
  sortOrder: 'asc' | 'desc' = 'asc';

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
  createApiToken() {
    console.log('Create API-Token');
  }
}
