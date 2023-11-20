import sha256 from 'crypto-js/sha256';
import isObject from '../object-helpers';

export interface Method {
  name: string;
  methodHash: string;
}

export interface Class {
  id: string;
  name: string;
  methods: Method[];
  parent: Package;
}

export interface Package {
  id: string;
  name: string;
  subPackages: Package[];
  classes: Class[];
  parent?: Package;
}

export interface Application {
  id: string;
  name: string;
  language: string;
  instanceId: string;
  parent: Node;
  packages: Package[];
}

export interface Node {
  id: string;
  ipAddress: string;
  hostName: string;
  applications: Application[];
}

export interface StructureLandscapeData {
  landscapeToken: string;
  nodes: Node[];
}

export function isLandscape(x: any): x is StructureLandscapeData {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'nodes');
}

export function isNode(x: any): x is Node {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'applications');
}

export function isApplication(x: any): x is Application {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'packages');
}

export function isPackage(x: any): x is Package {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'classes');
}

export function isClass(x: any): x is Class {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'methods');
}

export function isMethod(x: any): x is Method {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'hashCode');
}

export function preProcessAndEnhanceStructureLandscape(
  landscapeStructure: StructureLandscapeData
) {
  const entitiesForIdHashing: Set<Class | Package | Application | Node> =
    new Set();

  function createNodeId(node: Node) {
    const { hostName, ipAddress } = node;
    node.id = `${hostName}#${ipAddress}`;
    entitiesForIdHashing.add(node);
  }

  function createApplicationId(app: Application) {
    const { hostName, ipAddress } = app.parent;
    app.id = `${hostName}#${ipAddress}#${app.instanceId}`;
    entitiesForIdHashing.add(app);
  }

  function createPackageIds(component: Package, parentId: string) {
    component.id = `${parentId}.${component.name}`;
    entitiesForIdHashing.add(component);
    component.subPackages.forEach((subComponent) => {
      createPackageIds(subComponent, component.id);
    });
  }

  function createClassIds(components: Package[]) {
    components.forEach((component) => {
      component.classes.forEach((clazz) => {
        clazz.id = `${component.id}.${clazz.name}`;
        entitiesForIdHashing.add(clazz);
      });
      createClassIds(component.subPackages);
    });
  }

  function addParentToPackage(child: Package, parent: Package) {
    child.parent = parent;
    child.subPackages.forEach((subChild) =>
      addParentToPackage(subChild, child)
    );
  }

  function addParentToClazzes(component: Package) {
    component.classes.forEach((clazz) => {
      clazz.parent = component;
    });
    component.subPackages.forEach((subPackage) => {
      addParentToClazzes(subPackage);
    });
  }

  function addParentToApplication(app: Application, parent: Node) {
    app.parent = parent;
  }

  function hashEntityIds() {
    entitiesForIdHashing.forEach((entity) => {
      entity.id = sha256(entity.id).toString();
    });
  }

  /* const a = performance.now(); */
  const enhancedlandscapeStructure: StructureLandscapeData = JSON.parse(
    JSON.stringify(landscapeStructure)
  );

  enhancedlandscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((app) => {
      addParentToApplication(app, node);
      createApplicationId(app);
      app.packages.forEach((component) => {
        // create package ids in Java notation, e.g., 'net.explorviz.test'
        // and add parent relations for quicker access
        createPackageIds(component, app.id);
        component.subPackages.forEach((subComponent) => {
          addParentToPackage(subComponent, component);
        });
        addParentToClazzes(component);
      });
      createClassIds(app.packages);
    });
    createNodeId(node);
  });

  hashEntityIds();

  return enhancedlandscapeStructure;
}
