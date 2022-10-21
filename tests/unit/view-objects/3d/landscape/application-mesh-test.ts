import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import { Color } from 'three';
import {
  Application,
  Node,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';

module('Unit | View Object | 3d/landscape/application-mesh', (hooks) => {
  setupTest(hooks);

  test('Default highlighting color is assigned', (assert) => {
    const planeLayout = new PlaneLayout();
    const defaultColor = new Color('green');

    const applicationMesh = new ApplicationMesh(
      planeLayout,
      application,
      defaultColor
    );

    const highlightingColor = applicationMesh.highlightingColor
      .getHexString()
      .toLowerCase();

    const redColor = 'ff0000';
    assert.equal(highlightingColor, redColor);
  });

  test('Datamodel is assigned to mesh', (assert) => {
    const planeLayout = new PlaneLayout();
    const defaultColor = new Color('green');

    const applicationMesh = new ApplicationMesh(
      planeLayout,
      application,
      defaultColor
    );

    assert.equal(application, applicationMesh.dataModel);
  });

  test('Passed default color is correctly applied to material', (assert) => {
    const planeLayout = new PlaneLayout();
    const defaultColor = new Color('#ff00ff');

    const applicationMesh = new ApplicationMesh(
      planeLayout,
      application,
      defaultColor
    );

    const applicationMaterialColor =
      applicationMesh.material.color.getHexString();

    assert.equal(applicationMaterialColor, defaultColor.getHexString());
  });
});

const node: Node = {
  id: 'foo.100.100.100.100',
  ipAddress: '100.100.100.100',
  hostName: 'foo',
  applications: [],
};

const application: Application = {
  id: 'foo.100.100.100.100.1000',
  name: 'SampleApplication',
  language: 'java',
  instanceId: '1000',
  parent: node,
  packages: [],
};

node.applications.push(application);
