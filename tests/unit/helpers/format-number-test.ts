import { formatNumber } from 'explorviz-frontend/helpers/format-number';
import { module, test } from 'qunit';

module('Unit | Helper | format number test', function (/* hooks */) {
  test('numbers are formatted correctly', function (assert) {
    const resultMs = formatNumber([2106245250.00, 'ms']);
    assert.equal(resultMs, '2106.2452');

    const resultS = formatNumber([2106245250.00, 's']);
    assert.equal(resultS, '2.1062');
  });
});
