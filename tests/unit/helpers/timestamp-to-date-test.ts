import { timestampToDate } from 'explorviz-frontend/helpers/timestamp-to-date';
import { module, test } from 'qunit';

module('Unit | Helper | timestamp to date', function (/* hooks */) {
  test('timestamp to time', function (assert) {
    const timestamp = 1549204338000;

    const result = timestampToDate([timestamp, 'time']);
    let expected: any = new Date(timestamp);

    const hours = expected.getHours();
    const minutes = `0${expected.getMinutes()}`;
    const seconds = `0${expected.getSeconds()}`;

    expected = `${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`;

    assert.equal(result, expected);
  });

  test('timestamp to localString', function (assert) {
    const timestamp = 1549204338000;

    const result = timestampToDate([timestamp, 'localString']);
    const expected = new Date(timestamp).toLocaleString();

    assert.equal(result, expected);
  });

  test('timestamp to String', function (assert) {
    const timestamp = 1549204338000;

    const result = timestampToDate([timestamp, '']);
    const expected = new Date(timestamp).toString();

    assert.equal(result, expected);
  });

  test('timestamp to default Date', function (assert) {
    const timestamp = 1549204338000;

    const result = timestampToDate([timestamp, '']);
    const expected = new Date(timestamp);

    assert.equal(result, expected);
  });
});
