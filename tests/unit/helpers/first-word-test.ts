import { firstWord } from 'explorviz-frontend/helpers/first-word';
import { module, test } from 'qunit';

module('Unit | Helper | first word', function (/* hooks */) {
  test('first word of multiple words', function (assert) {
    const result = firstWord(['First second']);
    assert.equal(result, 'First');
  });

  test('first word of single word', function (assert) {
    const result = firstWord(['word']);
    assert.equal(result, 'word');
  });

  test('first word of empty string', function (assert) {
    const result = firstWord(['']);
    assert.equal(result, '');
  });
});
