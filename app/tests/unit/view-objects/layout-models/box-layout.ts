import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import BoxLayout from 'some-react-lib/src/view-objects/layout-models/box-layout';
import * as THREE from 'three';

module('Unit | View Object | layout-models/box-layout', function (hooks) {
  setupTest(hooks);

  test('Position is set correctly through setter', function (assert) {
    const boxLayout = new BoxLayout();
    boxLayout.position = new THREE.Vector3(10, 20, 30);

    const positionComponentsEqual =
      boxLayout.positionX === 10 &&
      boxLayout.positionY === 20 &&
      boxLayout.positionZ === 30;

    assert.ok(positionComponentsEqual);
  });

  test('center is calculated correctly', function (assert) {
    const boxLayout = new BoxLayout();
    boxLayout.position = new THREE.Vector3(10, 20, 30);
    boxLayout.width = 100;
    boxLayout.height = 200;
    boxLayout.depth = 150;

    const centerPoint = boxLayout.center;

    const centerIsCorrect =
      centerPoint.x === 60 &&
      boxLayout.positionY === 120 &&
      boxLayout.positionZ === 105;

    assert.ok(centerIsCorrect);
  });
});
