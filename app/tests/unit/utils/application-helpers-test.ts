import {
  getAllMethodHashCodesInApplication,
  applicationHasClass,
} from 'explorviz-frontend/utils/application-helpers';
import {
  Application,
  Class,
  Node,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { module, test } from 'qunit';

module('Unit | Utility | application-helpers', function () {
  test('getAllMethodHashCodesInApplication', function (assert) {
    const testApplication = getTestNode().applications[0];
    const methodHashSet = new Set(
      getAllMethodHashCodesInApplication(testApplication)
    );
    assert.ok(methodHashSet.size === 4);
  });

  test('applicationHasClass against not included class', function (assert) {
    const testApplication = getTestNode().applications[0];
    const hasClass = applicationHasClass(testApplication, getTestClass());
    assert.ok(!hasClass);
  });

  test('applicationHasClass against included class', function (assert) {
    const testApplication = getTestNode().applications[0];
    const includedClass = testApplication.packages[0].subPackages[0].classes[0];
    const hasClass = applicationHasClass(testApplication, includedClass);
    assert.ok(hasClass);
  });
});

function getTestClass() {
  const testPackage: Package = {
    id: 'package123',
    name: 'package123',
    subPackages: [],
    classes: [],
  };

  const testClass: Class = {
    id: 'class123',
    name: 'class123',
    methods: [],
    parent: testPackage,
  };

  testPackage.classes.push(testClass);

  return testClass;
}

function getTestNode() {
  const testNode: Node = {
    id: 'testNode.testIp',
    ipAddress: 'testIp',
    hostName: 'testNode',
    applications: [],
  };

  const testApplication: Application = {
    id: 'testNode.testIp.applicationId',
    name: 'application',
    instanceId: 'applicationId',
    language: 'testLanguage',
    parent: testNode,
    packages: [],
  };

  testNode.applications.push(testApplication);

  testApplication.packages.push(getTestPackage1(), getTestPackage2());

  return testNode;
}

function getTestPackage1() {
  const testPackage11: Package = {
    id: 'package11',
    name: 'package11',
    subPackages: [],
    classes: [],
  };

  const subPackage11: Package = {
    id: 'subPackage11',
    name: 'subPackage11',
    subPackages: [],
    classes: [],
    parent: testPackage11,
  };

  const subPackage12: Package = {
    id: 'subPackage12',
    name: 'subPackage12',
    subPackages: [],
    classes: [],
    parent: testPackage11,
  };

  const subSubPackage: Package = {
    id: 'subSubPackage',
    name: 'subSubPackage',
    subPackages: [],
    classes: [],
    parent: subPackage11,
  };

  testPackage11.subPackages.push(subPackage11, subPackage12);
  subPackage11.subPackages.push(subSubPackage);

  const testClass11: Class = {
    id: 'class11',
    name: 'class11',
    methods: [
      {
        name: 'method11',
        methodHash: 'method11Hash',
      },
    ],
    parent: testPackage11,
  };

  const testClass12: Class = {
    id: 'class12',
    name: 'class12',
    methods: [
      {
        name: 'method12',
        methodHash: 'method12Hash',
      },
    ],
    parent: testPackage11,
  };

  testPackage11.classes.push(testClass11, testClass12);

  const testClass13: Class = {
    id: 'class13',
    name: 'class13',
    methods: [
      {
        name: 'method13',
        methodHash: 'method13Hash',
      },
    ],
    parent: subPackage11,
  };

  subPackage11.classes.push(testClass13);

  return testPackage11;
}

function getTestPackage2() {
  const testPackage21: Package = {
    id: 'package21',
    name: 'package21',
    subPackages: [],
    classes: [],
  };

  const subPackage21: Package = {
    id: 'subPackage21',
    name: 'subPackage21',
    subPackages: [],
    classes: [],
    parent: testPackage21,
  };

  testPackage21.subPackages.push(subPackage21);

  const testClass21: Class = {
    id: 'class21',
    name: 'class21',
    methods: [
      {
        name: 'method21',
        methodHash: 'method21Hash',
      },
    ],
    parent: subPackage21,
  };

  subPackage21.classes.push(testClass21);

  return testPackage21;
}
