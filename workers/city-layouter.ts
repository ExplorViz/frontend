// Wait for the initial message event.
self.addEventListener(
    'message',
    function (e) {
      const structureData = e.data.structure;
      const dynamicData = e.data.dynamic;
  
      const cityLayout = applyBoxLayout(structureData, dynamicData);
      postMessage(cityLayout);
    },
    false
  );
  
  // Ping the Ember service to say that everything is ok.
  postMessage(true);
  
  /******* Define Layouter *******/

  type LayoutData = {
    height: number,
    width: number,
    depth: number,
    positionX: number,
    positionY: number,
    positionZ: number
  }
  
  type LayoutSegment = {
    parent: null | LayoutSegment,
    lowerChild: null | LayoutSegment,
    upperRightChild: null | LayoutSegment,
    startX: number,
    startZ: number,
    width: number,
    height: number,
    used: boolean
  }
  
  type ReducedClass = {
    id: string,
    name: string,
    instanceCount: number,
    methods: ReducedMethod[]
  }

  type ReducedMethod = {
    name: string;
    hashCode: string // TODO tiwe
  }
  
  type ReducedComponent = {
    id: string,
    name: string,
    classes: ReducedClass[],
    subPackages: ReducedComponent[] // TODO tiwe
  }
  
  type ReducedApplication = {
    id: string,
    packages: ReducedComponent[]
  }

  type ReducedTrace = { // TODO tiwe
    spanList: {
        hashCode: string
    }[]
  }
  
  // TODO tiwe
  function applyBoxLayout(application: ReducedApplication, allLandscapeTraces: ReducedTrace[]) {
    function getAllClazzesInApplication(application: ReducedApplication): ReducedClass[] {
      let allComponents = getAllComponentsInApplication(application);
  
      let allClasses: ReducedClass[] = [];
      allComponents.forEach((component) => {
        allClasses.push(...component.classes);
      });
      return allClasses;
    }
  
    function getAllComponentsInApplication(application: ReducedApplication): ReducedComponent[]  {
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
  
    const INSET_SPACE = 4.0;
    const OPENED_COMPONENT_HEIGHT = 1.5;
  
    const layoutMap = new Map();
    const instanceCountMap = new Map();
  
    layoutMap.set(application.id, {
      height: 1,
      width: 1,
      depth: 1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
    });
  
    getAllClazzesInApplication(application).forEach((clazz) => {
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
  
    calcClazzHeight(application, allLandscapeTraces);
    initApplication(application);
  
    doApplicationLayout(application);
    setAbsoluteLayoutPositionOfApplication(application);
  
    // Scale dimensions for needs of application rendering
    layoutMap.forEach((box) => {
      box.positionX *= 0.5;
      box.positionZ *= 0.5;
      box.width *= 0.5;
      box.depth *= 0.5;
    });
  
    return layoutMap;
  
    // Helper functions
  
    function setAbsoluteLayoutPositionOfApplication(application: ReducedApplication): void {
      const { packages } = application;
  
      let componentLayout = layoutMap.get(application.id);
  
      packages.forEach((childComponent) => {
        let childCompLayout = layoutMap.get(childComponent.id);
  
        childCompLayout.positionX += componentLayout.positionX;
        childCompLayout.positionY +=
          componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
        childCompLayout.positionZ += componentLayout.positionZ;
  
        setAbsoluteLayoutPosition(childComponent);
      });
    }
  
    function setAbsoluteLayoutPosition(component: ReducedComponent): void {
      const childComponents = component.subPackages;
      const clazzes = component.classes;
  
      let componentLayout = layoutMap.get(component.id);
  
      childComponents.forEach((childComponent) => {
        let childCompLayout = layoutMap.get(childComponent.id);
  
        childCompLayout.positionX += componentLayout.positionX;
        childCompLayout.positionY +=
          componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
        childCompLayout.positionZ += componentLayout.positionZ;
  
        setAbsoluteLayoutPosition(childComponent);
      });
  
      clazzes.forEach((clazz) => {
        let clazzLayout = layoutMap.get(clazz.id);
  
        clazzLayout.positionX += componentLayout.positionX;
        clazzLayout.positionY +=
          componentLayout.positionY + OPENED_COMPONENT_HEIGHT;
        clazzLayout.positionZ += componentLayout.positionZ;
      });
    }
  
    function getHashCodeToClassMap(clazzes: ReducedClass[]): Map<string, ReducedClass> {
      const hashCodeToClassMap = new Map<string, ReducedClass>();
  
      clazzes.forEach((clazz) => {
        clazz.methods.forEach(({ hashCode }) =>
          hashCodeToClassMap.set(hashCode, clazz)
        );
      });
  
      return hashCodeToClassMap;
    }
  
    function getAllSpanHashCodesFromTraces(traceArray: ReducedTrace[]): string[] {
      const hashCodes: string[] = [];
  
      traceArray.forEach((trace) => {
        trace.spanList.forEach((span) => {
          hashCodes.push(span.hashCode);
        });
      });
      return hashCodes;
    }
  
    function calcClazzHeight(application: ReducedApplication, allLandscapeTraces: ReducedTrace[]): void {
      const CLAZZ_SIZE_DEFAULT = 1.5;
      const CLAZZ_SIZE_EACH_STEP = 1.5;
  
      const clazzes: ReducedClass[] = [];
      application.packages.forEach((component) => {
        getClazzList(component, clazzes);
      });
  
      const hashCodeToClassMap = getHashCodeToClassMap(clazzes);
  
      const allMethodHashCodes =
        getAllSpanHashCodesFromTraces(allLandscapeTraces);
  
      for (let methodHashCode of allMethodHashCodes) {
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
        const clazzLayout = layoutMap.get(clazz.id);
  
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
  
      function useThreshholds(listWithout0And1: number[], list: number[], result: number[]): void {
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
          let categoryValue = getCategoryFromValues(entry, t1, t2);
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
  
      function useLinear(listWithout0: number[], list: number[], result: number[]): void {
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
  
      function getCategoryFromLinearValues(value: number, t1: number, t2: number, t3: number) {
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
  
    function getClazzList(component: ReducedComponent, classesArray: ReducedClass[]): void {
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
  
    function initApplication(application: ReducedApplication): void {
      const { packages } = application;
  
      packages.forEach((child) => {
        initNodes(child);
      });
  
      let componentData = layoutMap.get(application.id);
      componentData.height = OPENED_COMPONENT_HEIGHT;
      componentData.width = -1.0;
      componentData.depth = -1.0;
    }
  
    function initNodes(component: ReducedComponent): void {
      const children = component.subPackages;
      const clazzes = component.classes;
  
      const clazzWidth = 2.0;
  
      children.forEach((child) => {
        initNodes(child);
      });
  
      clazzes.forEach((clazz) => {
        let clazzData = layoutMap.get(clazz.id);
        clazzData.depth = clazzWidth;
        clazzData.width = clazzWidth;
      });
  
      let componentData = layoutMap.get(component.id);
      componentData.height = getHeightOfComponent(component);
      componentData.width = -1.0;
      componentData.depth = -1.0;
    }
  
    function getHeightOfComponent(component: ReducedComponent): number {
      const floorHeight = 0.75 * 4.0;
  
      let childrenHeight = floorHeight;
  
      const children = component.subPackages;
      const clazzes = component.classes;
  
      clazzes.forEach((clazz) => {
        let clazzData = layoutMap.get(clazz.id);
        const height = clazzData.height;
        if (height > childrenHeight) {
          childrenHeight = height;
        }
      });
  
      children.forEach((child) => {
        let childData = layoutMap.get(child.id);
        if (childData.height > childrenHeight) {
          childrenHeight = childData.height;
        }
      });
  
      return childrenHeight + 0.1;
    }
  
    function doApplicationLayout(application: ReducedApplication): void {
      const { packages } = application;
  
      packages.forEach((child) => {
        doLayout(child);
      });
  
      layoutChildrenOfApplication(application);
    }
  
    function layoutChildrenOfApplication(application: ReducedApplication): void {
      let tempList: ReducedComponent[] = [];
  
      const { packages } = application;
  
      packages.forEach((child) => {
        tempList.push(child);
      });
  
      const segment = layoutGeneric(tempList);
  
      let componentData = layoutMap.get(application.id);
      componentData.width = segment.width;
      componentData.depth = segment.height;
    }
  
    function doLayout(component: ReducedComponent): void {
      const children = component.subPackages;
  
      children.forEach((child) => {
        doLayout(child);
      });
  
      layoutChildren(component);
    }
  
    function layoutChildren(component: ReducedComponent): void {
      let tempList: (ReducedClass | ReducedComponent)[] = [];
  
      const children = component.subPackages;
      const clazzes = component.classes;
  
      clazzes.forEach((clazz) => {
        tempList.push(clazz);
      });
  
      children.forEach((child) => {
        tempList.push(child);
      });
  
      const segment = layoutGeneric(tempList);
  
      let componentData = layoutMap.get(component.id);
      componentData.width = segment.width;
      componentData.depth = segment.height;
    }
  
    function layoutGeneric(children: (ReducedClass | ReducedComponent)[]): LayoutSegment {
      const rootSegment = createRootSegment(children);
  
      let maxX = 0.0;
      let maxZ = 0.0;
  
      // Sort by width and by name (for entities with same width)
      children.sort(function (e1, e2) {
        let e1Width = layoutMap.get(e1.id).width;
        let e2Width = layoutMap.get(e2.id).width;
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
        let childData = layoutMap.get(child.id);
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
        let childData = layoutMap.get(child.id);
        childData.positionX = childData.positionX + INSET_SPACE;
      });
  
      rootSegment.width += INSET_SPACE;
  
      return rootSegment;
  
      function insertFittingSegment(rootSegment: LayoutSegment, toFitWidth: number, toFitHeight: number): null | LayoutSegment {
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
  
    function createRootSegment(children: (ReducedClass | ReducedComponent)[]): LayoutSegment {
      let worstCaseWidth = 0.0;
      let worstCaseHeight = 0.0;
  
      children.forEach((child) => {
        let childData = layoutMap.get(child.id);
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
    } // END createLayoutSegment
  }
  