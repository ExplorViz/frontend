import calculateColorBrightness from 'explorviz-frontend/utils/helpers/threejs-helpers';
import { module, test } from 'qunit';
import { Color } from 'three';

module('Unit | Utility | helpers/threejs helpers', (/* hooks */) => {
  // Replace this with your real tests.
  test('it works', (assert) => {
    const result = calculateColorBrightness(new Color(1, 0, 0), 1.1);
    assert.ok(result);
  });
});
