import {
  getClassMethodHashCodes,
  getClassAncestorPackages,
} from 'explorviz-frontend/utils/class-helpers';
import {
  Class,
  Method,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { module, test } from 'qunit';

module('Unit | Utility | class-helpers', function () {
  test('getClassMethodHashCodes with 1 method', function (assert) {
    const testClass = getTestPackageWithOneClassAndOneMethod().classes[0];
    const hashCodeArray = getClassMethodHashCodes(testClass);
    assert.ok(hashCodeArray.length === 1 && hashCodeArray[0] === 'testHash');
  });

  test('getClassMethodHashCodes with empty method array', function (assert) {
    const testClass = getTestPackageWithOneClassNoMethods().classes[0];
    const hashCodeArray = getClassMethodHashCodes(testClass);
    assert.ok(hashCodeArray.length === 0);
  });

  test('getClassAncestorPackages with one parent package', function (assert) {
    const testClass = getTestPackageWithNoParentAndOneClass().classes[0];
    const ancestors = getClassAncestorPackages(testClass);
    assert.ok(ancestors.length === 1);
  });

  test('getClassAncestorPackages with two ancestor packages', function (assert) {
    const testClass =
      getTestPackageWithOneParentAndOneClass().subPackages[0].classes[0];
    const ancestors = getClassAncestorPackages(testClass);
    assert.ok(ancestors.length === 2 && ancestors[0] !== ancestors[1]);
  });
});

function getTestPackageWithOneClassAndOneMethod() {
  const testPackage: Package = {
    id: 'package',
    name: 'package',
    subPackages: [],
    classes: [],
  };

  const testClass: Class = {
    id: 'class',
    name: 'class',
    methods: [],
    parent: testPackage,
  };

  const testMethod: Method = {
    name: 'testMethod',
    hashCode: 'testHash',
  };

  testClass.methods.push(testMethod);
  testPackage.classes.push(testClass);

  return testPackage;
}

function getTestPackageWithOneClassNoMethods() {
  const testPackage: Package = {
    id: 'package',
    name: 'package',
    subPackages: [],
    classes: [],
  };

  const testClass: Class = {
    id: 'class',
    name: 'class',
    methods: [],
    parent: testPackage,
  };

  testPackage.classes.push(testClass);

  return testPackage;
}

function getTestPackageWithNoParentAndOneClass() {
  const testPackage: Package = {
    id: 'package',
    name: 'package',
    subPackages: [],
    classes: [],
  };

  const testClass: Class = {
    id: 'class',
    name: 'class',
    methods: [],
    parent: testPackage,
  };

  testPackage.classes.push(testClass);

  return testPackage;
}

function getTestPackageWithOneParentAndOneClass() {
  const testPackage: Package = {
    id: 'package',
    name: 'package',
    subPackages: [],
    classes: [],
  };

  const testSubPackage: Package = {
    id: 'subPackage',
    name: 'subPackage',
    subPackages: [],
    classes: [],
  };

  testPackage.subPackages.push(testSubPackage);
  testSubPackage.parent = testPackage;

  const testClass: Class = {
    id: 'class',
    name: 'class',
    methods: [],
    parent: testSubPackage,
  };

  testSubPackage.classes.push(testClass);

  return testPackage;
}
