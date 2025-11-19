import sha256 from 'crypto-js/sha256';
import isObject from 'explorviz-frontend/src/utils/object-helpers';

export interface Variable {
  private: boolean;
  name: string;
  type: string;
}
export interface Parameters {
  name: string;
  type: string;
}
export type Method = {
  originOfData: TypeOfAnalysis;
  id: string;
  name: string;
  type: string;
  private: boolean;
  methodHash: string;
  parameters: Parameters[];
};
export interface Interface {
  name: string;
  methods: Method[];
  variables: Variable[];
}
export enum TypeOfAnalysis {
  Dynamic = 'dynamic',
  Static = 'static',
  StaticAndDynamic = 'static+dynamic',
  Editing = 'editing',
}

export type BaseModel = {
  id: string;
  name: string;
  variables?: Variable[];
  extends?: Class[];
  implements?: Interface[];
  editingState?: 'added' | 'removed';
};

type OriginOfData = {
  originOfData: TypeOfAnalysis;
};

export type Class = BaseModel &
  OriginOfData & {
    name: string;
    fqn: string | undefined;
    methods: Method[];
    parent: Package;
    level: number;
  };

export type Package = BaseModel &
  OriginOfData & {
    name: string;
    fqn: string | undefined;
    subPackages: Package[];
    classes: Class[];
    parent?: Package;
    level: number;
  };

export type Application = BaseModel &
  OriginOfData & {
    name: string;
    language: string;
    instanceId: string;
    parentId: string;
    packages: Package[];
  };

export type Node = BaseModel &
  OriginOfData & {
    ipAddress: string;
    hostName: string;
    applications: Application[];
  };

export interface K8sPod {
  id: string;
  name: string;
  originOfData: TypeOfAnalysis.Dynamic;
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
  k8sNodes: K8sNode[] | undefined;
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

export function getApplicationsFromNodes(nodes: Node[]) {
  const applications: Application[] = [];
  for (let i = 0; i < nodes.length; ++i) {
    const node = nodes[i];
    for (let j = 0; j < node.applications.length; ++j) {
      applications.push(node.applications[j]);
    }
  }
  return applications;
}

export function getK8sAppsFromNodes(k8sNodes: K8sNode[]) {
  return k8sNodes.flatMap((n) =>
    n.k8sNamespaces.flatMap((ns) =>
      ns.k8sDeployments.flatMap((d) =>
        d.k8sPods.flatMap((p) =>
          p.applications.map((app) => {
            return {
              k8sNode: n,
              k8sNamespace: ns,
              k8sDeployment: d,
              k8sPod: p,
              app: app,
            };
          })
        )
      )
    )
  );
}

export function getAllPackagesAndClassesFromLandscape(
  landscapeStructure: StructureLandscapeData
): { packages: Package[]; classes: Class[] } {
  const packages: Package[] = [];
  const classes: Class[] = [];

  function collectPackagesAndClasses(pkg: Package) {
    packages.push(pkg);
    classes.push(...pkg.classes);
    pkg.subPackages.forEach(collectPackagesAndClasses);
  }

  // Get packages and classes from regular nodes
  landscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((app) => {
      app.packages.forEach(collectPackagesAndClasses);
    });
  });

  // Get packages and classes from k8s nodes if they exist
  if (landscapeStructure.k8sNodes) {
    landscapeStructure.k8sNodes.forEach((k8sNode) => {
      k8sNode.k8sNamespaces.forEach((k8sNamespace) => {
        k8sNamespace.k8sDeployments.forEach((k8sDeployment) => {
          k8sDeployment.k8sPods.forEach((k8sPod) => {
            k8sPod.applications.forEach((app) => {
              app.packages.forEach(collectPackagesAndClasses);
            });
          });
        });
      });
    });
  }

  return { packages, classes };
}

export function getNodeById(
  landscapeStructure: StructureLandscapeData,
  id: string
) {
  return landscapeStructure.nodes.find((node) => node.id === id);
}

export function preProcessAndEnhanceStructureLandscape(
  landscapeStructure: StructureLandscapeData,
  typeOfAnalysis: TypeOfAnalysis
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
    app.id = `${parent.id}#application-${app.name}`;
    entitiesForIdHashing.add(app);
  }

  function createPackageIdsAndFqns(
    component: Package,
    parentId: string,
    parentFqn = ''
  ) {
    component.id = `${parentId}.component-${component.name}`;
    component.fqn = parentFqn
      ? `${parentFqn}.${component.name}`
      : component.name;
    entitiesForIdHashing.add(component);
    if (component.subPackages) {
      component.subPackages.forEach((subComponent) => {
        createPackageIdsAndFqns(subComponent, component.id, component.fqn);
      });
    } else {
      component.subPackages = [];
    }
  }

  function createClassIds(components: Package[]) {
    components.forEach((component) => {
      component.classes.forEach((clazz) => {
        clazz.id = `${component.id}.class-${clazz.name}`;
        clazz.fqn = `${component.fqn}.${clazz.name}`;
        entitiesForIdHashing.add(clazz);
        clazz.methods.forEach((method) => {
          method.originOfData = typeOfAnalysis;
        });
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

  function setOriginStatus(typeOfAnalysis: TypeOfAnalysis) {
    entitiesForIdHashing.forEach((entity) => {
      entity.originOfData = typeOfAnalysis;
    });
  }

  /* const a = performance.now(); */
  const enhancedlandscapeStructure: StructureLandscapeData =
    structuredClone(landscapeStructure);

  let pods: K8sPod[] = [];
  if (enhancedlandscapeStructure.k8sNodes) {
    pods = enhancedlandscapeStructure.k8sNodes.flatMap((k8sNode) =>
      k8sNode.k8sNamespaces.flatMap((k8sNamespace) =>
        k8sNamespace.k8sDeployments.flatMap(
          (k8sDeployment) => k8sDeployment.k8sPods
        )
      )
    );
  }

  [...enhancedlandscapeStructure.nodes, ...pods].forEach((node) => {
    createNodeId(node);
    node.applications.forEach((app) => {
      createApplicationId(app, node);
      addParentToApplication(app, node);
      app.packages.forEach((component) => {
        // create package ids in Java notation, e.g., 'net.explorviz.test'
        // and add parent relations for quicker access
        createPackageIdsAndFqns(component, app.id);
        component.subPackages.forEach((subComponent) => {
          addParentToPackage(subComponent, component);
        });
        addParentToClazzes(component);
      });
      createClassIds(app.packages);
    });
  });

  hashEntityIds();
  setOriginStatus(typeOfAnalysis);

  return enhancedlandscapeStructure;
}
