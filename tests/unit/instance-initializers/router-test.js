import Application from '@ember/application';
import { initialize } from 'explorviz-frontend/instance-initializers/router';
import { module, test } from 'qunit';
import destroyApp from '../../helpers/destroy-app';

module('Unit | Instance Initializer | router', function (hooks) {
  hooks.beforeEach(function () {
    this.TestApplication = Application.extend();
    this.TestApplication.instanceInitializer({
      name: 'initializer under test',
      initialize,
    });
    this.application = this.TestApplication.create({ autoboot: false });
    this.instance = this.application.buildInstance();
  });
  hooks.afterEach(function () {
    destroyApp(this.application);
    destroyApp(this.instance);
  });

  // Replace this with your real tests.
  test('it works', async function (assert) {
    await this.instance.boot();

    assert.ok(true);
  });
});
