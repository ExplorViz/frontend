import Service, { inject as service } from '@ember/service';
import { AuthenticatedUser, useAuthStore } from 'react-lib/src/stores/auth';

export default class Auth extends Service.extend() {
  @service('router')
  router!: any;

  get user() {
    return useAuthStore.getState().user;
  }

  set user(value: AuthenticatedUser | undefined) {
    useAuthStore.setState({ user: value });
  }

  get accessToken(): string | undefined {
    return useAuthStore.getState().accessToken;
  }

  set accessToken(value: string | undefined) {
    useAuthStore.setState({ accessToken: value });
  }

  login() {
    this.router.transitionTo('landscapes');
  }

  /**
   * Check if we are authenticated
   */
  async checkLogin() {
    // ToDo: Implement Keycloak
    return;
  }

  logout() {
    // ToDo: Implement Keycloak
    return true;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    auth: Auth;
  }
}
