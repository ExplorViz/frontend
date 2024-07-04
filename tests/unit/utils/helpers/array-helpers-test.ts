import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';
import { module, test } from 'qunit';

module('Unit | Utility | helpers/array-helpers', function () {
  test('it works with null values', function (assert) {
    let result = areArraysEqual(null, null);
    assert.ok(result, 'Both null should return true');

    result = areArraysEqual([1, 2, 3], null);
    assert.notOk(result, 'Array and null should return false');

    result = areArraysEqual(null, [1, 2, 3]);
    assert.notOk(result, 'Null and array should return false');
  });

  test('it works with empty arrays', function (assert) {
    let result = areArraysEqual([], []);
    assert.ok(result, 'Both empty arrays should return true');
  });

  test('it works with primitive arrays', function (assert) {
    let result = areArraysEqual([1, 2, 3], [1, 2, 3]);
    assert.ok(result, 'Identical primitive arrays should return true');

    result = areArraysEqual([1, 2, 3], [1, 2, 4]);
    assert.notOk(result, 'Different primitive arrays should return false');

    result = areArraysEqual([1, 2, 3], [1, 2]);
    assert.notOk(result, 'Arrays of different lengths should return false');
  });

  test('it works with complex object arrays', function (assert) {
    let result = areArraysEqual(
      [{ a: 1, b: 2 }, { c: 3 }],
      [{ a: 1, b: 2 }, { c: 3 }]
    );
    assert.ok(result, 'Identical object arrays should return true');

    result = areArraysEqual(
      [{ a: 1, b: 2 }, { c: 3 }],
      [{ a: 1, b: 2 }, { c: 4 }]
    );
    assert.notOk(result, 'Different object arrays should return false');
  });

  test('it works with nested object arrays', function (assert) {
    let result = areArraysEqual(
      [{ a: { nested: 1 } }, { b: { nested: 2 } }],
      [{ a: { nested: 1 } }, { b: { nested: 2 } }]
    );
    assert.ok(result, 'Identical nested object arrays should return true');

    result = areArraysEqual(
      [{ a: { nested: 1 } }, { b: { nested: 2 } }],
      [{ a: { nested: 1 } }, { b: { nested: 3 } }]
    );
    assert.notOk(result, 'Different nested object arrays should return false');
  });
});
