import { on } from '@ember/modifier';
import Service, { inject as service } from '@ember/service';
import Component from '@glimmer/component';

export default class DevLogin extends Component<IArgs> {
  @service('router')
  router!: any;

  enableDevMode = () => {
    sessionStorage.setItem('no-auth', 'true');
    this.router.transitionTo('/landscapes');
  };

  <template>
    <div class='d-flex justify-content-center'>
      <button type='submit' {{on 'click' this.enableDevMode}}>
        Sign in for Development
      </button>
    </div>
  </template>
}
