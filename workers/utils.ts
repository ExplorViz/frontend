import { ReducedApplication, ReducedClass, ReducedComponent, Trace } from "./worker-types";


export function getAllClassesInApplication(application: ReducedApplication): ReducedClass[] {
  let allComponents = getAllComponentsInApplication(application);

  let allClasses: ReducedClass[] = [];
  allComponents.forEach((component) => {
    allClasses.push(...component.classes);
  });
  return allClasses;
}

export function getAllComponentsInApplication(application: ReducedApplication): ReducedComponent[]  {
  let children = application.packages;

  let components: ReducedComponent[] = [];

  children.forEach((component) => {
    components.push(...getAllComponents(component), component);
  });
  return components;
}

function getAllComponents(component: ReducedComponent): ReducedComponent[] {
  let components: ReducedComponent[] = [];
  component.subPackages.forEach((component) => {
    components.push(...getAllComponents(component), component);
  });

  return components;
}

export function getHashCodeToClassMap(classes: ReducedClass[]): Map<string, ReducedClass> {
  const hashCodeToClassMap = new Map<string, ReducedClass>();

  classes.forEach((clazz) => {
    clazz.methods.forEach(({ hashCode }) =>
      hashCodeToClassMap.set(hashCode, clazz)
    );
  });

  return hashCodeToClassMap;
}

export function getClassList(component: ReducedComponent, classesArray: ReducedClass[]): void {
  const children = component.subPackages;
  const classes = component.classes;

  children.forEach((child) => {
    getClassList(child, classesArray);
  });

  classes.forEach((clazz) => {
    classesArray.push(clazz);
  });
}

export function getAllSpanHashCodesFromTraces(traceArray: Trace[]): string[] {
  const hashCodes: string[] = [];

  traceArray.forEach((trace) => {
    trace.spanList.forEach((span) => {
      hashCodes.push(span.hashCode);
    });
  });
  return hashCodes;
}
