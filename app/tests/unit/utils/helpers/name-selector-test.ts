import processNameSelector from 'explorviz-frontend/utils/helpers/name-selector';
import { module, test } from 'qunit';

module('Unit | Utility | helpers/name selector', function (/* hooks */) {
  // Replace this with your real tests.
  test('it works', (assert) => {
    const result = processNameSelector('1234', '');
    assert.equal(result, '1234');
  });
});
