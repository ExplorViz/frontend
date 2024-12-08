import { nameSelector } from 'explorviz-frontend/helpers/name-selector';
import { module, test } from 'qunit';

module('Unit | Helper | name selector', function (/* hooks */) {
  test('name is present', function (assert) {
    const result = nameSelector(['123456', 'pName']);
    assert.equal(result, 'pName');
  });
});
