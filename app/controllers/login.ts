import Controller from '@ember/controller';

export default class LoginController extends Controller {
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    'loginController': LoginController;
  }
}
