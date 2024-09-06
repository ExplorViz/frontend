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
  parentId: string;
  packages: Package[];
}

export interface Node {
  id: string;
  ipAddress: string;
  hostName: string;
  applications: Application[];
}

export interface K8sPod {
  id: string;
  name: string;
  applications: Application[];
}

export interface K8sDeployment {
  name: string;
  k8sPods: K8sPod[];
}

export interface K8sNamespace {
  name: string;
  k8sDeployments: K8sDeployment[];
}

export interface K8sNode {
  name: string;
  k8sNamespaces: K8sNamespace[];
}

export interface StructureLandscapeData {
  landscapeToken: string;
  nodes: Node[];
  k8sNodes: K8sNode[];
}

export function isLandscape(x: any): x is StructureLandscapeData {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'nodes');
}

export function isNode(x: any): x is Node {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'hostName');
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
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'methodHash');
}

export function getNodeById(
  landscapeStructure: StructureLandscapeData,
  id: string
) {
  return landscapeStructure.nodes.find((node) => node.id === id);
}

export function preProcessAndEnhanceStructureLandscape(
  landscapeStructure: StructureLandscapeData
) {
  const entitiesForIdHashing: Set<
    Class | Package | Application | Node | K8sPod
  > = new Set();

  function createNodeId(node: Node | K8sPod) {
    if (isNode(node)) {
      const { hostName, ipAddress } = node;
      node.id = `${hostName}#${ipAddress}`;
      entitiesForIdHashing.add(node);
      return;
    }
    const { name } = node;
    node.id = name;
    entitiesForIdHashing.add(node);
  }

  function createApplicationId(app: Application, parent: Node | K8sPod) {
    app.id = `${parent.id}#${app.name}`;
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

  function addParentToApplication(app: Application, parent: Node | K8sPod) {
    app.parentId = parent.id;
  }

  function hashEntityIds() {
    entitiesForIdHashing.forEach((entity) => {
      entity.id = sha256(entity.id).toString();
      if (isApplication(entity)) {
        entity.parentId = sha256(entity.parentId).toString();
      }
    });
  }

  /* const a = performance.now(); */
  const enhancedlandscapeStructure: StructureLandscapeData =
    structuredClone(landscapeStructure);

  const pods = enhancedlandscapeStructure.k8sNodes.flatMap((k8sNode) =>
    k8sNode.k8sNamespaces.flatMap((k8sNamespace) =>
      k8sNamespace.k8sDeployments.flatMap(
        (k8sDeployment) => k8sDeployment.k8sPods
      )
    )
  );

  [...enhancedlandscapeStructure.nodes, ...pods].forEach((node) => {
    createNodeId(node);
    node.applications.forEach((app) => {
      createApplicationId(app, node);
      addParentToApplication(app, node);
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
  });

  hashEntityIds();

  return enhancedlandscapeStructure;
}
