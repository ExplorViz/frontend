/* eslint-disable consistent-return */
import { module } from 'qunit';
import { Promise } from 'rsvp';
import startApp from './start-app';
import destroyApp from './destroy-app';

export default (name, options = {}) => {
  module(name, {
    beforeEach() {
      this.application = startApp();

      if (options.beforeEach) {
        return options.beforeEach.apply(this, arguments);
      }
    },

    async afterEach() {
      const afterEach = options.afterEach && options.afterEach.apply(this, arguments);
      await Promise.resolve(afterEach);
      return destroyApp(this.application);
    },
  });
}
