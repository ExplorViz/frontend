import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import {Color} from 'three';

module('Unit | View Object | 3d/base-mesh', (hooks) => {
  setupTest(hooks);

  test('Default highlighting color is assigned', (assert) => {
    const defaultColor = new Color('green');

    const applicationMesh = new BaseMeshMock(defaultColor);

    const highlightingColor = applicationMesh.highlightingColor.getHexString().toLowerCase();

    const redColor = 'ff0000';
    assert.equal(highlightingColor, redColor);
  });

  test('Highlighting property is set correctly when highlighting', (assert) => {
    const defaultColor = new Color('green');

    const baseMesh = new BaseMeshMock(defaultColor);

    baseMesh.highlight();

    assert.equal(baseMesh.highlighted, true);
  });

  test('Highlighting property is set correctly when un-highlighting', (assert) => {
    const defaultColor = new Color('green');

    const baseMesh = new BaseMeshMock(defaultColor);

    baseMesh.highlight();
    baseMesh.unhighlight();

    assert.equal(baseMesh.highlighted, false);
  });
});

// BaseMesh is an abstract class
// need to extend from it for testing
class BaseMeshMock extends BaseMesh {}
