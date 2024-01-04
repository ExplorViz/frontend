import {
  applicationHasClass,
  getAllClassesInApplication,
  getAllMethodHashCodesInApplication,
} from './application-helpers';
import { Trace } from './landscape-schemes/dynamic/dynamic-data';
import {
  Application,
  Class,
  isApplication,
  Method,
  Node,
  Package,
  StructureLandscapeData,
} from './landscape-schemes/structure-data';
import { getAncestorPackages, getPackageById } from './package-helpers';
import { getTraceIdToSpanTree, SpanTree } from './trace-helpers';

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

// TODO: write function that combines two landscape structures. Make sure that we call this methods with copies of the original data since we modify attributes
export function combineStructures(structureA?: StructureLandscapeData, structureB?: StructureLandscapeData) : StructureLandscapeData | undefined {
 
  if(!structureA && !structureB)
    return undefined;

  if(!structureA) {
    return structureB;
  }

  if(!structureB) {
    return structureA;
  }
 
  if(structureA.landscapeToken !== structureB.landscapeToken) {
    return undefined;
  }
  const nodes = [];
  for(const nodeA of structureA.nodes) {
    const nodeB = findCommonNode(nodeA, structureB.nodes);
    if(nodeB){
      const applications : Application[] = combineApplications(nodeA.applications, nodeB.applications);
      nodeB.applications = applications;
    }else {
      // missing node
      nodes.push(nodeA);
    }
  }

  addNodes(structureB, nodes); // adds missing nodes
  return structureB;
}

function findCommonMethod(method: Method, methods: Method[]) : Method | undefined {
  for(const mthd of methods) {
    if(mthd.methodHash === method.methodHash) {
      return mthd;
    }
  }
  return undefined;
}

function findCommonClass(clss: Class, classes: Class[]) : Class | undefined {
  for(const clazz of classes) {
    if(clazz.id === clss.id) {
      return clazz;
    }
  }
  return undefined;
}

function findCommonPackage(pckg: Package, packages: Package[]) : Package | undefined {
  for(const pckage of packages) {
    if(pckage.id === pckg.id) {
      return pckage;
    }
  }
  return undefined;
}

function combineMethods(methodsA: Method[], methodsB: Method[]) : Method[] {
  for(const methodA of methodsA){
    const methodB = findCommonMethod(methodA, methodsB);
    if(!methodB) {
      methodsB.push(methodA);
    }
  }

  return methodsB;
}

function combineClasses(classesA: Class[], classesB: Class[]) : Class[] {
  const classes: Class[] = [];
  for(const classA of classesA){
    const classB = findCommonClass(classA, classesB);
    if(classB) {
      const methods : Method[] = combineMethods(classA.methods, classB.methods);
      classB.methods = methods;
    }else {
      classes.push(classA);
    }
  }

  addClasses(classesB, classes); // adds missing classes
  return classesB;
}

function combinePackages(packagesA: Package[], packagesB: Package[]) : Package[] {
  const packages: Package[] = [];
  for(const packageA of packagesA){
    const packageB = findCommonPackage(packageA, packagesB);
    if(packageB) {
      const subPackages = combinePackages(packageA.subPackages, packageB.subPackages);
      const classes = combineClasses(packageA.classes, packageB.classes);
      packageB.subPackages = subPackages;
      packageB.classes = classes;
    }else {
      packages.push(packageA);
    }
  }

  addPackages(packagesB, packages); // adds missing packages 
  return packagesB;
}

function combineApplications(applicationsA: Application[], applicationsB: Application[]) : Application[] {
  const applications : Application[] = [];
  for(const applicationA of applicationsA) {
    const applicationB = findCommonApplication(applicationA, applicationsB);  
    if(applicationB) {
      const packages : Package[] = combinePackages(applicationA.packages, applicationB.packages);
      applicationB.packages = packages;
    }else {
      applications.push(applicationA);
    }
  }
  addApplications(applicationsB, applications); // adds missing applications and replaces existing ones 
  return applicationsB;
}

function findCommonApplication(application: Application, applications: Application[]) {
  // do we also need to consider instanceId? 
  for(const app of applications) {
    if(app.id === application.id) {
      return app;
    }
  }
  return undefined;
}

// finds and returns the node in the nodes-list
function findCommonNode(node: Node, nodes: Node[]) {
  for(const nd of nodes) {
    if(nd.id === node.id) {
      return nd;
    }
  }
  return undefined;
}

function addClasses(classesB: Class[], classes: Class[]) : Class[] {
  for (const clss of classes) {
    classesB.push(clss);
  }
  return classesB;
}

function addPackages(packagesB: Package[], packages: Package[]) : Package[] {
  for (const pckg of packages) {
      packagesB.push(pckg);
  }
  return packagesB;
}

function addApplications(applicationsB: Application[], applications: Application[]) : Application[] {
  for (const app of applications) {
    applicationsB.push(app);
  }
  return applicationsB;
}

function addNodes(structure: StructureLandscapeData, nodes: Node[]) : StructureLandscapeData {
  for (const node of nodes) {
    structure.nodes.push(node);
  }
  return structure;
}


export function spanIdToClass(
  structureData: Application | StructureLandscapeData,
  trace: Trace,
  spanId: string
) {
  const spanIdToClassMap = getSpanIdToClassMap(structureData, trace);
  return spanIdToClassMap.get(spanId);
}
