import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';

interface Args {
  tokens: LandscapeToken[];
  openTokenCreationModal(): void;
  selectToken(token: LandscapeToken): void;
  deleteToken(tokenId: string): Promise<undefined>;
  reload(): void;
}

export default class TokenSelection extends Component<Args> {
  @service('auth')
  auth!: Auth;

  @tracked
  sortProperty: keyof LandscapeToken = 'value';

  @tracked
  sortOrder: 'asc' | 'desc' = 'asc';

  @action
  sortBy(property: keyof LandscapeToken) {
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
}
