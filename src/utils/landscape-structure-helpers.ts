import {
  applicationHasClass,
  getAllClassesInApplication,
  getAllMethodHashCodesInApplication,
} from 'explorviz-frontend/src/utils/application-helpers';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Application,
  Node,
  Class,
  isApplication,
  StructureLandscapeData,
  Method,
  Package,
  TypeOfAnalysis,
  BaseModel,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  getAncestorPackages,
  getPackageById,
  packageContainsClass,
} from 'explorviz-frontend/src/utils/package-helpers';
import {
  getTraceIdToSpanTree,
  SpanTree,
} from 'explorviz-frontend/src/utils/trace-helpers';

export function getAllApplicationsInLandscape(
  landscapeStructure: StructureLandscapeData
) {
  return landscapeStructure.nodes.map((node) => node.applications).flat();
}

export function getApplicationInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string
): Application | undefined {
  return getAllApplicationsInLandscape(landscapeStructure).filter(
    (app) => app.id === id
  )[0];
}

export function getApplicationFromPackage(
  landscapeStructure: StructureLandscapeData,
  packageId: string
): Application | undefined {
  let matchingApplication: Application | undefined;

  landscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((application) => {
      const possibleMatch = application.packages.find(
        (packg) => packg.id === packageId
      );

      if (possibleMatch) {
        matchingApplication = application;
      }
    });
  });

  return matchingApplication;
}

export function getApplicationFromSubPackage(
  landscapeStructure: StructureLandscapeData,
  packageId: string
): Application | undefined {
  const pckg = getPackageById(landscapeStructure, packageId);
  if (pckg) {
    const ancestorPackages = getAncestorPackages(pckg);
    const pckgId = ancestorPackages[ancestorPackages.length - 1].id;
    const app = getApplicationFromPackage(landscapeStructure, pckgId);
    return app;
  }
  return undefined;
}

export function getApplicationFromClass(
  structureData: StructureLandscapeData,
  clazz: Class
): Application | undefined {
  let matchingApplication: Application | undefined;

  structureData.nodes.forEach((node) => {
    const possibleMatch = node.applications.find((application) =>
      applicationHasClass(application, clazz)
    );

    if (possibleMatch) {
      matchingApplication = possibleMatch;
    }
  });

  return matchingApplication;
}

export function getHashCodeToApplicationMap(
  landscapeStructure: StructureLandscapeData
) {
  const hashCodeToApplicationMap = new Map<string, Application>();

  landscapeStructure.nodes.forEach((node) =>
    node.applications.forEach((application) =>
      getAllMethodHashCodesInApplication(application).forEach((hashCode) =>
        hashCodeToApplicationMap.set(hashCode, application)
      )
    )
  );

  return hashCodeToApplicationMap;
}

export function getAllMethodHashesOfLandscapeStructureData(
  landscapeStructure: StructureLandscapeData
): string[] {
  const methodHashes: string[] = [];

  landscapeStructure.nodes.forEach((node) =>
    node.applications.forEach((application) =>
      getAllMethodHashCodesInApplication(application).forEach((hashCode) =>
        methodHashes.push(hashCode)
      )
    )
  );

  return methodHashes;
}

export function getHashCodeToClassMap(
  structureData: StructureLandscapeData | Application
) {
  const hashCodeToClassMap = new Map<string, Class>();

  let classList: Class[];

  if (isApplication(structureData)) {
    classList = getAllClassesInApplication(structureData);
  } else {
    classList = structureData.nodes
      .map((node) =>
        node.applications.map((application) =>
          getAllClassesInApplication(application)
        )
      )
      .flat(2);
  }

  classList.forEach((clazz) => {
    clazz.methods.forEach(({ methodHash }) => {
      hashCodeToClassMap.set(methodHash, clazz);
    });
  });

  return hashCodeToClassMap;
}

export function createTraceIdToSpanTrees(traces: Trace[]) {
  const traceIdToSpanTree = new Map<string, SpanTree>();

  traces.forEach((trace) => {
    traceIdToSpanTree.set(trace.traceId, getTraceIdToSpanTree(trace));
  });

  return traceIdToSpanTree;
}

export function getSpanIdToClassMap(
  structureData: Application | StructureLandscapeData,
  trace: Trace
) {
  const hashCodeToClassMap = getHashCodeToClassMap(structureData);

  const spanIdToClassMap = new Map<string, Class>();

  trace.spanList.forEach((span) => {
    const { methodHash, spanId } = span;

    const clazz = hashCodeToClassMap.get(methodHash);

    if (clazz !== undefined) {
      spanIdToClassMap.set(spanId, clazz);
    }
  });

  return spanIdToClassMap;
}

export function spanIdToClass(
  structureData: Application | StructureLandscapeData,
  trace: Trace,
  spanId: string
) {
  const spanIdToClassMap = getSpanIdToClassMap(structureData, trace);
  return spanIdToClassMap.get(spanId);
}

export function createEmptyStructureLandscapeData(): StructureLandscapeData {
  return { landscapeToken: '', nodes: [], k8sNodes: [] };
}

export function calculateFqn(classInstance: Class, delimiter: string): string {
  // Helper function to traverse the package hierarchy
  function getPackageNameHierarchy(pkg: Package | undefined): string[] {
    if (!pkg) {
      return [];
    }
    const parentNames = getPackageNameHierarchy(pkg.parent);
    return [...parentNames, pkg.name];
  }

  // Get the package name hierarchy
  const packageNames = getPackageNameHierarchy(classInstance.parent);

  // Join the package names with the given delimiter and append the class name
  const fqn = [...packageNames, classInstance.name].join(delimiter);

  return fqn;
}

// #region Combination

export function combineStructureLandscapeData(
  structureA: StructureLandscapeData,
  structureB: StructureLandscapeData
): StructureLandscapeData {
  if (!structureA) {
    return structureB;
  }

  if (!structureB) {
    return structureA;
  }

  const structure: StructureLandscapeData = {
    landscapeToken: structureA.landscapeToken,
    nodes: [],
    k8sNodes: [],
  };

  for (const nodeA of structureA.nodes) {
    const nodeB = findCommonNode(nodeA, structureB.nodes);
    if (nodeB) {
      const combinedNode: Node = {
        id: nodeB.id,
        name: nodeB.name,
        ipAddress: nodeB.ipAddress,
        hostName: nodeB.hostName,
        originOfData: TypeOfAnalysis.StaticAndDynamic,
        applications: [],
      };
      const applications: Application[] = combineApplications(
        nodeA.applications,
        nodeB.applications
      );
      combinedNode.applications = applications;
      applications.forEach((app) => (app.parentId = combinedNode.id));
      structure.nodes.push(combinedNode);
    } else {
      // node of structureA that is not in structureB
      structure.nodes.push(nodeA);
    }
  }

  // remaining nodes of structureB that are not in structureA
  for (const nodeB of structureB.nodes) {
    const nodeA = findCommonNode(nodeB, structureA.nodes);
    if (!nodeA) {
      structure.nodes.push(nodeB);
    }
  }

  // TODO: Combine properly
  if (structureA.k8sNodes) {
    for (const node of structureA.k8sNodes) {
      if (structure.k8sNodes) {
        structure.k8sNodes.push(node);
      } else {
        structure.k8sNodes = [node];
      }
    }
  }

  if (structureB.k8sNodes) {
    for (const node of structureB.k8sNodes) {
      if (structure.k8sNodes) {
        structure.k8sNodes.push(node);
      } else {
        structure.k8sNodes = [node];
      }
    }
  }

  return structure;
}
function findCommonMethod(
  method: Method,
  methods: Method[]
): Method | undefined {
  for (const mthd of methods) {
    if (mthd.methodHash === method.methodHash) {
      return mthd;
    }
  }
  return undefined;
}

function findCommonClass(clss: Class, classes: Class[]): Class | undefined {
  for (const clazz of classes) {
    if (clazz.id === clss.id) {
      return clazz;
    }
  }
  return undefined;
}

function findCommonPackage(
  pckg: Package,
  packages: Package[]
): Package | undefined {
  for (const pckage of packages) {
    if (pckage.id === pckg.id) {
      return pckage;
    }
  }
  return undefined;
}

function combineMethods(methodsA: Method[], methodsB: Method[]): Method[] {
  let methods: Method[] = [...methodsA];
  for (const methodB of methodsB) {
    const commonMethod = findCommonMethod(methodB, methodsA);
    if (!commonMethod) {
      methods.push(methodB);
    } else {
      commonMethod.originOfData = TypeOfAnalysis.StaticAndDynamic;
    }
  }

  return methods;
}

function combineClasses(classesA: Class[], classesB: Class[]): Class[] {
  const classes: Class[] = [];
  // Set origin of data for methods in classesA
  classesA.forEach((classA) => {
    classA.methods = classA.methods.map((method) => {
      method.originOfData = classA.originOfData;
      return method;
    });
  });
  // Set origin of data for methods in classesB
  classesB.forEach((classB) => {
    classB.methods = classB.methods.map((method) => {
      method.originOfData = classB.originOfData;
      return method;
    });
  });
  for (const classA of classesA) {
    const classB = findCommonClass(classA, classesB);
    if (classB) {
      const classModel: Class = {
        id: classB.id,
        level: classB.level,
        fqn: classB.fqn,
        originOfData: TypeOfAnalysis.StaticAndDynamic,
        name: classB.name,
        methods: [],
        parent: classB.parent,
      };
      const methods: Method[] = combineMethods(classA.methods, classB.methods);
      classModel.methods = methods;
      classes.push(classModel);
    } else {
      classes.push(classA);
    }
  }

  for (const classB of classesB) {
    const classA = findCommonClass(classB, classesA);
    if (!classA) {
      classes.push(classB);
    }
  }

  return classes;
}

function combinePackages(
  packagesA: Package[],
  packagesB: Package[]
): Package[] {
  const packages: Package[] = [];
  for (const packageA of packagesA) {
    const packageB = findCommonPackage(packageA, packagesB);
    if (packageB) {
      const combinedPackage: Package = {
        id: packageB.id,
        originOfData: TypeOfAnalysis.StaticAndDynamic,
        fqn: packageB.fqn,
        level: packageB.level,
        name: packageB.name,
        subPackages: [],
        classes: [],
        parent: packageB.parent,
      };

      const subPackages = combinePackages(
        packageA.subPackages,
        packageB.subPackages
      );
      const classes = combineClasses(packageA.classes, packageB.classes);
      classes.forEach((clazz) => (clazz.parent = combinedPackage));
      combinedPackage.subPackages = subPackages;
      subPackages.forEach((subPckg) => (subPckg.parent = combinedPackage));
      combinedPackage.classes = classes;
      packages.push(combinedPackage);
    } else {
      packages.push(packageA);
    }
  }

  for (const packageB of packagesB) {
    const packageA = findCommonPackage(packageB, packagesA);
    if (!packageA) {
      packages.push(packageB);
    }
  }

  return packages;
}

function combineApplications(
  applicationsA: Application[],
  applicationsB: Application[]
): Application[] {
  const applications: Application[] = [];
  for (const applicationA of applicationsA) {
    const applicationB = findCommonApplication(applicationA, applicationsB);
    if (applicationB) {
      const application: Application = {
        id: applicationB.id,
        originOfData: TypeOfAnalysis.StaticAndDynamic,
        name: applicationB.name,
        language: applicationB.language,
        instanceId: applicationB.instanceId,
        parentId: applicationB.parentId,
        packages: [],
      };
      const packages: Package[] = combinePackages(
        applicationA.packages,
        applicationB.packages
      );
      application.packages = packages;
      packages.forEach((pckg) => (pckg.parent = undefined));
      applications.push(application);
    } else {
      applications.push(applicationA);
    }
  }

  for (const applicationB of applicationsB) {
    const applicationA = findCommonApplication(applicationB, applicationsA);
    if (!applicationA) {
      applications.push(applicationB);
    }
  }
  return applications;
}

function findCommonApplication(
  application: Application,
  applications: Application[]
) {
  // do we also need to consider instanceId?
  for (const app of applications) {
    if (app.id === application.id) {
      return app;
    }
  }
  return undefined;
}

// finds and returns the node in the nodes-list
function findCommonNode(node: Node, nodes: Node[]) {
  for (const nd of nodes) {
    if (nd.id === node.id) {
      return nd;
    }
  }
  return undefined;
}

// #endregion

export interface SimpleClass {
  fqn: string;
  methods?: {
    name: string;
    private: boolean;
    parameters: {
      name: string;
      type: string;
    }[];
    returnType: string;
  }[];
}

export function insertApplicationToLandscape(
  structure: StructureLandscapeData,
  name: string,
  classes: SimpleClass[]
) {
  const nodeId = generateId();
  const appId = generateId();
  return [
    combineStructureLandscapeData(structure, {
      nodes: [
        {
          id: nodeId,
          name: 'Inserted Node',
          originOfData: TypeOfAnalysis.Static,
          applications: [
            {
              id: appId,
              name,
              language: 'Java',
              packages: packagesFromFlatClasses(classes),
              originOfData: TypeOfAnalysis.Editing,
              instanceId: '0',
              parentId: nodeId,
              editingState: 'added',
            },
          ],
          ipAddress: '0.0.0.0',
          hostName: '',
        },
      ],
      k8sNodes: [],
      landscapeToken: 'editing-landscape',
    }),
    appId,
  ] as const;
}

export function insertClassesToLandscape(
  structure: StructureLandscapeData,
  id: string,
  classes: SimpleClass[]
) {
  const application = getApplicationInLandscapeById(structure, id);
  if (application) {
    const newPackages = packagesFromFlatClasses(classes, application.packages);
    application.packages = newPackages;
  }
  return structure;
}

// classes are a list of fully qualified names
function packagesFromFlatClasses(
  classes: SimpleClass[],
  existingPackages?: Package[]
): Package[] {
  const rootPackagesMap = new Map<string, Package>();
  existingPackages?.forEach((pkg) => {
    rootPackagesMap.set(pkg.name, pkg);
  });

  classes.forEach(({ fqn, methods = [] }) => {
    const parts = fqn.split('.');
    let currentPackagesMap = rootPackagesMap;
    let parentPackage: Package | undefined = undefined;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let pkg = currentPackagesMap.get(part);

      if (!pkg) {
        pkg = {
          id: generateId(),
          name: part,
          classes: [],
          subPackages: [],
          originOfData: TypeOfAnalysis.Editing,
          fqn: parentPackage ? `${parentPackage.fqn}.${part}` : part,
          level: parentPackage ? parentPackage.level + 1 : 0,
          parent: parentPackage,
          editingState: 'added',
        };
        currentPackagesMap.set(part, pkg);
        if (parentPackage) {
          parentPackage.subPackages.push(pkg);
        }
      }

      parentPackage = pkg;
      currentPackagesMap = new Map<string, Package>();
      pkg.subPackages.forEach((subPkg) =>
        currentPackagesMap.set(subPkg.name, subPkg)
      );
    }

    // Add class to the last package
    if (parentPackage) {
      parentPackage.classes.push({
        id: generateId(),
        name: parts[parts.length - 1],
        methods: methods.map(
          ({ name, private: p, parameters, returnType }) => ({
            id: generateId(),
            type: returnType,
            private: p,
            parameters,
            name,
            originOfData: TypeOfAnalysis.Editing,
            methodHash: '',
          })
        ),
        originOfData: TypeOfAnalysis.Editing,
        fqn,
        parent: parentPackage,
        level: 0,
        editingState: 'added',
      });
    }
  });

  return Array.from(rootPackagesMap.values());
}

function generateId(): string {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(16).slice(2)
  ).join('');
}

export function removeComponentFromLandscape(
  structure: StructureLandscapeData,
  id: string
) {
  let removedIds = new Set<string>([id]);
  structure.nodes.map((node) => {
    const applications = node.applications.map((app) => {
      const [packages, removedSubIds] = removeSubpackageOrClass(
        id,
        app.packages,
        app.id === id
      );
      removedIds = removedIds.union(removedSubIds);
      const allChildrenRemoved = packages.every(isRemoved);
      const editingState =
        app.id === id || allChildrenRemoved ? 'removed' : app.editingState;

      if (editingState === 'removed') {
        removedIds.add(app.id);
      }
      return {
        ...app,
        packages,
        editingState,
      };
    });

    return {
      ...node,
      applications,
    };
  });
  return [structure, removedIds] as const;
}

function removeSubpackageOrClass(
  id: string,
  packages: Package[],
  parentRemoved: boolean
): [Package[], Set<string>] {
  let removedIds = new Set<string>();
  const pkgs = packages.map((pckg) => {
    const [subPackages, removedSubIds] = removeSubpackageOrClass(
      id,
      pckg.subPackages,
      parentRemoved || pckg.id === id
    );
    removedIds = removedIds.union(removedSubIds);
    const classes = pckg.classes.map((clazz) => {
      const editingState =
        clazz.id === id || parentRemoved || pckg.id === id
          ? 'removed'
          : clazz.editingState;
      if (editingState === 'removed') {
        removedIds.add(clazz.id);
      }
      return {
        ...clazz,
        editingState,
      };
    });
    const allChildrenRemoved =
      subPackages.every(isRemoved) && classes.every(isRemoved);
    const editingState =
      pckg.id === id || parentRemoved || allChildrenRemoved
        ? 'removed'
        : pckg.editingState;

    if (editingState === 'removed') {
      removedIds.add(pckg.id);
    }

    return {
      ...pckg,
      subPackages,
      classes,
      editingState,
    };
  });
  return [pkgs, removedIds];
}

function isRemoved(model: BaseModel): boolean {
  return model.editingState === 'removed';
}
