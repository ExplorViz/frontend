import type {
  ReducedApplication,
  ReducedComponent,
  ReducedClass,
  Trace,
  LayoutSegment,
} from './worker-types';

import {
  getAllClassesInApplication,
  getAllComponentsInApplication,
  getAllSpanHashCodesFromTraces,
  getHashCodeToClassMap,
} from './utils';
import type { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

// // Wait for the initial message event.
// self.addEventListener(
//   'message',
//   (e) => {
//     const structureData = e.data.structure;
//     const dynamicData = e.data.dynamic;

//     const cityLayout = applyBoxLayout(structureData, dynamicData);
//     postMessage(cityLayout);
//   },
//   false
// );

// // Ping the Ember service to say that everything is ok.
// postMessage(true);

/******* Define Layouter *******/

type ComponentLayout = {
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
};

export type CityLayout = Map<ReducedClass['id'], ComponentLayout>;

type InstanceCounts = Map<ReducedClass['id'], number>;

const INSET_SPACE = 4.0;
const OPENED_COMPONENT_HEIGHT = 1.5;

function applyBoxLayout(
  application: ReducedApplication,
  allLandscapeTraces: Trace[]
): CityLayout {
  const layoutMap = new Map<ReducedClass['id'], ComponentLayout>();
  const instanceCountMap = new Map<ReducedClass['id'], number>();

  layoutMap.set(application.id, {
    height: 1,
    width: 1,
    depth: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  });

  getAllClassesInApplication(application).forEach((clazz) => {
    layoutMap.set(clazz.id, {
      height: 1,
      width: 1,
      depth: 1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
    });
    instanceCountMap.set(clazz.id, 0);
  });

  getAllComponentsInApplication(application).forEach((component) => {
    layoutMap.set(component.id, {
      height: 1,
      width: 1,
      depth: 1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
    });
  });

  calcClazzHeight(layoutMap, instanceCountMap, application, allLandscapeTraces);
  initApplication(layoutMap, application);

  doApplicationLayout(layoutMap, application);
  setAbsoluteLayoutPositionOfApplication(layoutMap, application);

  // Scale dimensions for needs of application rendering
  layoutMap.forEach((box) => {
    box.positionX *= 0.5;
    box.positionZ *= 0.5;
    box.width *= 0.5;
    box.depth *= 0.5;
  });

  return layoutMap;
}

export function computeLayoutForApplication(
  application: Application,
  dynamicData: Trace[]
) {
  // TODO: Fix types
  return applyBoxLayout(
    application as unknown as ReducedApplication,
    dynamicData
  );
}

// Helper functions

function setAbsoluteLayoutPositionOfApplication(
  layoutMap: CityLayout,
  application: ReducedApplication
): void {
  const { packages } = application;

  const componentLayout = layoutMap.get(application.id);

  if (componentLayout === undefined) {
    throw new Error(
      `Component layout not found for application ${application.id}`
    );
  }

  packages.forEach((childComponent) => {
    const childCompLayout = layoutMap.get(childComponent.id);

    if (childCompLayout === undefined) {
      throw new Error(`Child ${childComponent.id} not found.`);
    }

    childCompLayout.positionX += componentLayout.positionX;
    childCompLayout.positionY +=
      componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
    childCompLayout.positionZ += componentLayout.positionZ;

    setAbsoluteLayoutPosition(layoutMap, childComponent);
  });
}

function setAbsoluteLayoutPosition(
  layoutMap: CityLayout,
  component: ReducedComponent
): void {
  const childComponents = component.subPackages;
  const clazzes = component.classes;

  const componentLayout = layoutMap.get(component.id)!;

  childComponents.forEach((childComponent) => {
    const childCompLayout = layoutMap.get(childComponent.id)!;

    childCompLayout.positionX += componentLayout.positionX;
    childCompLayout.positionY +=
      componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
    childCompLayout.positionZ += componentLayout.positionZ;

    setAbsoluteLayoutPosition(layoutMap, childComponent);
  });

  clazzes.forEach((clazz) => {
    const clazzLayout = layoutMap.get(clazz.id)!;

    clazzLayout.positionX += componentLayout.positionX;
    clazzLayout.positionY +=
      componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
    clazzLayout.positionZ += componentLayout.positionZ;
  });
}

function calcClazzHeight(
  layoutMap: CityLayout,
  instanceCountMap: InstanceCounts,
  application: ReducedApplication,
  allLandscapeTraces: Trace[]
): void {
  const CLAZZ_SIZE_DEFAULT = 1.5;
  const CLAZZ_SIZE_EACH_STEP = 1.5;

  const clazzes: ReducedClass[] = [];
  application.packages.forEach((component) => {
    getClazzList(component, clazzes);
  });

  const hashCodeToClassMap = getHashCodeToClassMap(clazzes);

  const allMethodHashCodes = getAllSpanHashCodesFromTraces(allLandscapeTraces);

  for (const methodHashCode of allMethodHashCodes) {
    const classMatchingTraceHashCode = hashCodeToClassMap.get(methodHashCode);

    if (classMatchingTraceHashCode === undefined) {
      continue;
    }

    const methodMatchingSpanHash = classMatchingTraceHashCode.methods.find(
      (method) => method.hashCode === methodHashCode
    );

    if (methodMatchingSpanHash === undefined) {
      continue;
    }

    // OpenCensus denotes constructor calls with <init>
    // Therefore, we count the <init>s for all given classes
    if (methodMatchingSpanHash.name === '<init>') {
      classMatchingTraceHashCode.instanceCount++;
    }
  }

  const instanceCountList: number[] = [];

  clazzes.forEach((clazz) => {
    const instanceCount = clazz.instanceCount ? clazz.instanceCount : 0;
    instanceCountList.push(instanceCount);
  });

  const categories = getCategories(instanceCountList, false);

  clazzes.forEach((clazz) => {
    const clazzLayout = layoutMap.get(clazz.id)!;

    clazzLayout.height =
      CLAZZ_SIZE_EACH_STEP * categories[clazz.instanceCount] +
      CLAZZ_SIZE_DEFAULT;
    instanceCountMap.set(clazz.id, clazz.instanceCount);
  });
}

function getCategories(list: number[], linear: boolean): number[] {
  const result: number[] = [];

  if (list.length === 0) {
    return result;
  }

  list.sort();

  if (linear) {
    const listWithout0: number[] = [];

    list.forEach((entry) => {
      if (entry !== 0) {
        listWithout0.push(entry);
      }
    });

    if (listWithout0.length === 0) {
      result.push(0.0);
      return result;
    }
    useLinear(listWithout0, list, result);
  } else {
    const listWithout0And1: number[] = [];

    list.forEach((entry) => {
      if (entry !== 0 && entry !== 1) {
        listWithout0And1.push(entry);
      }
    });

    if (listWithout0And1.length === 0) {
      result.push(0.0);
      result.push(1.0);
      return result;
    }

    useThreshholds(listWithout0And1, list, result);
  }

  return result;

  // inner helper functions

  function useThreshholds(
    listWithout0And1: number[],
    list: number[],
    result: number[]
  ): void {
    let max = 1;

    listWithout0And1.forEach((value) => {
      if (value > max) {
        max = value;
      }
    });

    const oneStep = max / 3.0;

    const t1 = oneStep;
    const t2 = oneStep * 2;

    list.forEach((entry) => {
      const categoryValue = getCategoryFromValues(entry, t1, t2);
      result[entry] = categoryValue;
    });
  }

  function getCategoryFromValues(value: number, t1: number, t2: number) {
    if (value === 0) {
      return 0.0;
    } else if (value === 1) {
      return 1.0;
    }

    if (value <= t1) {
      return 2.0;
    } else if (value <= t2) {
      return 3.0;
    } else {
      return 4.0;
    }
  }

  function useLinear(
    listWithout0: number[],
    list: number[],
    result: number[]
  ): void {
    let max = 1;
    let secondMax = 1;

    listWithout0.forEach((value) => {
      if (value > max) {
        secondMax = max;
        max = value;
      }
    });

    const oneStep = secondMax / 4.0;

    const t1 = oneStep;
    const t2 = oneStep * 2;
    const t3 = oneStep * 3;

    list.forEach((entry) => {
      const categoryValue = getCategoryFromLinearValues(entry, t1, t2, t3);
      result[entry] = categoryValue;
    });
  }

  function getCategoryFromLinearValues(
    value: number,
    t1: number,
    t2: number,
    t3: number
  ) {
    if (value <= 0) {
      return 0;
    } else if (value <= t1) {
      return 1.5;
    } else if (value <= t2) {
      return 2.5;
    } else if (value <= t3) {
      return 4.0;
    } else {
      return 6.5;
    }
  }
} // END getCategories

function getClazzList(
  component: ReducedComponent,
  classesArray: ReducedClass[]
): void {
  const children = component.subPackages;
  const clazzes = component.classes;

  children.forEach((child) => {
    getClazzList(child, classesArray);
  });

  clazzes.forEach((clazz) => {
    clazz.instanceCount = 0; // TODO: why?
    classesArray.push(clazz);
  });
}

function initApplication(
  layoutMap: CityLayout,
  application: ReducedApplication
): void {
  const { packages } = application;

  packages.forEach((child) => {
    initNodes(layoutMap, child);
  });

  const componentData = layoutMap.get(application.id)!;
  componentData.height = OPENED_COMPONENT_HEIGHT;
  componentData.width = -1.0;
  componentData.depth = -1.0;
}

function initNodes(layoutMap: CityLayout, component: ReducedComponent): void {
  const children = component.subPackages;
  const clazzes = component.classes;

  const clazzWidth = 2.0;

  children.forEach((child) => {
    initNodes(layoutMap, child);
  });

  clazzes.forEach((clazz) => {
    const clazzData = layoutMap.get(clazz.id)!;
    clazzData.depth = clazzWidth;
    clazzData.width = clazzWidth;
  });

  const componentData = layoutMap.get(component.id)!;
  componentData.height = getHeightOfComponent(layoutMap, component);
  componentData.width = -1.0;
  componentData.depth = -1.0;
}

function getHeightOfComponent(
  layoutMap: CityLayout,
  component: ReducedComponent
): number {
  const floorHeight = 0.75 * 4.0;

  let childrenHeight = floorHeight;

  const children = component.subPackages;
  const clazzes = component.classes;

  clazzes.forEach((clazz) => {
    const clazzData = layoutMap.get(clazz.id)!;
    const height = clazzData.height;
    if (height > childrenHeight) {
      childrenHeight = height;
    }
  });

  children.forEach((child) => {
    const childData = layoutMap.get(child.id)!;
    if (childData.height > childrenHeight) {
      childrenHeight = childData.height;
    }
  });

  return childrenHeight + 0.1;
}

function doApplicationLayout(
  layoutMap: CityLayout,
  application: ReducedApplication
): void {
  const { packages } = application;

  packages.forEach((child) => {
    doLayout(layoutMap, child);
  });

  layoutChildrenOfApplication(layoutMap, application);
}

function layoutChildrenOfApplication(
  layoutMap: CityLayout,
  application: ReducedApplication
): void {
  const tempList: ReducedComponent[] = [];

  const { packages } = application;

  packages.forEach((child) => {
    tempList.push(child);
  });

  const segment = layoutGeneric(layoutMap, tempList);

  const componentData = layoutMap.get(application.id)!;
  componentData.width = segment.width;
  componentData.depth = segment.height;
}

function doLayout(layoutMap: CityLayout, component: ReducedComponent): void {
  const children = component.subPackages;

  children.forEach((child) => {
    doLayout(layoutMap, child);
  });

  layoutChildren(layoutMap, component);
}

function layoutChildren(
  layoutMap: CityLayout,
  component: ReducedComponent
): void {
  const tempList: (ReducedClass | ReducedComponent)[] = [];

  const children = component.subPackages;
  const clazzes = component.classes;

  clazzes.forEach((clazz) => {
    tempList.push(clazz);
  });

  children.forEach((child) => {
    tempList.push(child);
  });

  const segment = layoutGeneric(layoutMap, tempList);

  const componentData = layoutMap.get(component.id)!;
  componentData.width = segment.width;
  componentData.depth = segment.height;
}

function layoutGeneric(
  layoutMap: CityLayout,
  children: (ReducedClass | ReducedComponent)[]
): LayoutSegment {
  const rootSegment = createRootSegment(layoutMap, children);

  let maxX = 0.0;
  let maxZ = 0.0;

  // Sort by width and by name (for entities with same width)
  children.sort((e1, e2) => {
    const e1Width = layoutMap.get(e1.id)!.width;
    const e2Width = layoutMap.get(e2.id)!.width;
    const result = e1Width - e2Width;

    if (-0.00001 < result && result < 0.00001) {
      return e1.name.localeCompare(e2.name);
    }

    if (result < 0) {
      return 1;
    } else {
      return -1;
    }
  });

  children.forEach((child) => {
    const childData = layoutMap.get(child.id)!;
    const childWidth = childData.width + INSET_SPACE * 2;
    const childHeight = childData.depth + INSET_SPACE * 2;
    childData.positionY = 0.0;

    const foundSegment = insertFittingSegment(
      rootSegment,
      childWidth,
      childHeight
    );

    if (foundSegment) {
      childData.positionX = foundSegment.startX + INSET_SPACE;
      childData.positionZ = foundSegment.startZ + INSET_SPACE;

      if (foundSegment.startX + childWidth > maxX) {
        maxX = foundSegment.startX + childWidth;
      }
      if (foundSegment.startZ + childHeight > maxZ) {
        maxZ = foundSegment.startZ + childHeight;
      }
    }
  });

  rootSegment.width = maxX;
  rootSegment.height = maxZ;

  // Add labelInset space

  children.forEach((child) => {
    const childData = layoutMap.get(child.id)!;
    childData.positionX = childData.positionX + INSET_SPACE;
  });

  rootSegment.width += INSET_SPACE;

  return rootSegment;

  function insertFittingSegment(
    rootSegment: LayoutSegment,
    toFitWidth: number,
    toFitHeight: number
  ): null | LayoutSegment {
    if (
      !rootSegment.used &&
      toFitWidth <= rootSegment.width &&
      toFitHeight <= rootSegment.height
    ) {
      const resultSegment = createLayoutSegment();
      rootSegment.upperRightChild = createLayoutSegment();
      rootSegment.lowerChild = createLayoutSegment();

      resultSegment.startX = rootSegment.startX;
      resultSegment.startZ = rootSegment.startZ;
      resultSegment.width = toFitWidth;
      resultSegment.height = toFitHeight;
      resultSegment.parent = rootSegment;

      rootSegment.upperRightChild.startX = rootSegment.startX + toFitWidth;
      rootSegment.upperRightChild.startZ = rootSegment.startZ;
      rootSegment.upperRightChild.width = rootSegment.width - toFitWidth;
      rootSegment.upperRightChild.height = toFitHeight;
      rootSegment.upperRightChild.parent = rootSegment;

      if (rootSegment.upperRightChild.width <= 0.0) {
        rootSegment.upperRightChild = null;
      }

      rootSegment.lowerChild.startX = rootSegment.startX;
      rootSegment.lowerChild.startZ = rootSegment.startZ + toFitHeight;
      rootSegment.lowerChild.width = rootSegment.width;
      rootSegment.lowerChild.height = rootSegment.height - toFitHeight;
      rootSegment.lowerChild.parent = rootSegment;

      if (rootSegment.lowerChild.height <= 0.0) {
        rootSegment.lowerChild = null;
      }

      rootSegment.used = true;
      return resultSegment;
    } else {
      let resultFromUpper: LayoutSegment | null = null;
      let resultFromLower: LayoutSegment | null = null;

      if (rootSegment.upperRightChild !== null) {
        resultFromUpper = insertFittingSegment(
          rootSegment.upperRightChild,
          toFitWidth,
          toFitHeight
        );
      }

      if (rootSegment.lowerChild !== null) {
        resultFromLower = insertFittingSegment(
          rootSegment.lowerChild,
          toFitWidth,
          toFitHeight
        );
      }

      if (resultFromUpper == null) {
        return resultFromLower;
      } else if (resultFromLower == null) {
        return resultFromUpper;
      } else {
        // choose best fitting square
        const upperBoundX = resultFromUpper.startX + resultFromUpper.width;

        const lowerBoundZ = resultFromLower.startZ + resultFromLower.height;

        if (upperBoundX <= lowerBoundZ && resultFromLower.parent) {
          resultFromLower.parent.used = false;
          return resultFromUpper;
        } else if (resultFromUpper.parent) {
          resultFromUpper.parent.used = false;
          return resultFromLower;
        } else {
          return null;
        }
      }
    }
  }
} // END layoutGeneric

function createRootSegment(
  layoutMap: CityLayout,
  children: (ReducedClass | ReducedComponent)[]
): LayoutSegment {
  let worstCaseWidth = 0.0;
  let worstCaseHeight = 0.0;

  children.forEach((child) => {
    const childData = layoutMap.get(child.id)!;
    worstCaseWidth += childData.width + INSET_SPACE * 2;
    worstCaseHeight += childData.depth + INSET_SPACE * 2;
  });

  const rootSegment = createLayoutSegment();

  rootSegment.startX = 0.0;
  rootSegment.startZ = 0.0;

  rootSegment.width = worstCaseWidth;
  rootSegment.height = worstCaseHeight;

  return rootSegment;
}

function createLayoutSegment(): LayoutSegment {
  const layoutSegment = {
    parent: null,
    lowerChild: null,
    upperRightChild: null,
    startX: 0,
    startZ: 0,
    width: 1,
    height: 1,
    used: false,
  };

  return layoutSegment;
}
// END createLayoutSegment
