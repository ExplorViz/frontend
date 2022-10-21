import {
  Class,
  Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import {
  getClassesInPackage,
  getSubPackagesOfPackage,
} from 'explorviz-frontend/utils/package-helpers';
import { module, test } from 'qunit';

module('Unit | Utility | package-helpers', function () {
  test('getClassesInPackage without recursion', function (assert) {
    const classes = getClassesInPackage(getTestPackage(), false);
    assert.ok(
      classes.length === 2 &&
        classes.some((clss) => clss.id === 'class1') &&
        classes.some((clss) => clss.id === 'class2')
    );
  });

  test('getClassesInPackage with recursion', function (assert) {
    const classes = getClassesInPackage(getTestPackage(), true);
    assert.ok(
      classes.length === 3 &&
        classes.some((clss) => clss.id === 'class1') &&
        classes.some((clss) => clss.id === 'class2') &&
        classes.some((clss) => clss.id === 'class3')
    );
  });

  test('getSubPackagesOfPackage without recursion', function (assert) {
    const pckgs = getSubPackagesOfPackage(getTestPackage(), false);
    assert.ok(
      pckgs.length === 2 &&
        pckgs.some((pckg) => pckg.id === 'subPackage') &&
        pckgs.some((pckg) => pckg.id === 'subPackage2')
    );
  });

  test('getSubPackagesOfPackage with recursion', function (assert) {
    const pckgs = getSubPackagesOfPackage(getTestPackage(), true);
    assert.ok(
      pckgs.length === 3 &&
        pckgs.some((pckg) => pckg.id === 'subPackage') &&
        pckgs.some((pckg) => pckg.id === 'subPackage2') &&
        pckgs.some((pckg) => pckg.id === 'subSubPackage')
    );
  });
});

function getTestPackage() {
  /*
    testPackage
      ├── classes
      │   ├── class1
      │   └── class2
      ├── subPackage
      │   ├── classes
      │   │   └── class3
      │   └── subSubPackage
      └── subPackage2
  */
  const testPackage: Package = {
    id: 'package',
    name: 'package',
    subPackages: [],
    classes: [],
  };

  const subPackage: Package = {
    id: 'subPackage',
    name: 'subPackage',
    subPackages: [],
    classes: [],
    parent: testPackage,
  };

  const subPackage2: Package = {
    id: 'subPackage2',
    name: 'subPackage2',
    subPackages: [],
    classes: [],
    parent: testPackage,
  };

  const subSubPackage: Package = {
    id: 'subSubPackage',
    name: 'subSubPackage',
    subPackages: [],
    classes: [],
    parent: subPackage,
  };

  testPackage.subPackages.push(subPackage, subPackage2);
  subPackage.subPackages.push(subSubPackage);

  const testClass1: Class = {
    id: 'class1',
    name: 'class1',
    methods: [],
    parent: testPackage,
  };

  const testClass2: Class = {
    id: 'class2',
    name: 'class2',
    methods: [],
    parent: testPackage,
  };

  const testClass3: Class = {
    id: 'class3',
    name: 'class3',
    methods: [],
    parent: subPackage,
  };

  testPackage.classes.push(testClass1, testClass2);
  subPackage.classes.push(testClass3);

  return testPackage;
}
