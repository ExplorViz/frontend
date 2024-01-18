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

function applyBoxLayout(application, allLandscapeTraces) {
  function getAllClazzesInApplication(application) {
    let allComponents = getAllComponentsInApplication(application);

    let allClazzes = [];
    allComponents.forEach((component) => {
      allClazzes.push(...component.classes);
    });
    return allClazzes;
  }

  function getAllComponentsInApplication(application) {
    let children = application.packages;

    let components = [];

    children.forEach((component) => {
      components.push(...getAllComponents(component), component);
    });
    return components;
  }

  function getAllComponents(component) {
    let components = [];
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

  function setAbsoluteLayoutPositionOfApplication(application) {
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

  function setAbsoluteLayoutPosition(component) {
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

  function getHashCodeToClassMap(clazzes) {
    const hashCodeToClassMap = new Map();

    clazzes.forEach((clazz) => {
      clazz.methods.forEach(({ hashCode }) =>
        hashCodeToClassMap.set(hashCode, clazz)
      );
    });

    return hashCodeToClassMap;
  }

  function getAllSpanHashCodesFromTraces(traceArray) {
    const hashCodes = [];

    traceArray.forEach((trace) => {
      trace.spanList.forEach((span) => {
        hashCodes.push(span.methodHash);
      });
    });
    return hashCodes;
  }

  function calcClazzHeight(application, allLandscapeTraces) {
    const CLAZZ_SIZE_DEFAULT = 1.5;
    const CLAZZ_SIZE_EACH_STEP = 1.5;

    const clazzes = [];
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
        (method) => method.methodHash === methodHashCode
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

    const instanceCountList = [];

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

  function getCategories(list, linear) {
    const result = [];

    if (list.length === 0) {
      return result;
    }

    list.sort();

    if (linear) {
      const listWithout0 = [];

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
      const listWithout0And1 = [];

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

    function useThreshholds(listWithout0And1, list, result) {
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

    function getCategoryFromValues(value, t1, t2) {
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

    function useLinear(listWithout0, list, result) {
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

    function getCategoryFromLinearValues(value, t1, t2, t3) {
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

  function getClazzList(component, clazzesArray) {
    const children = component.subPackages;
    const clazzes = component.classes;

    children.forEach((child) => {
      getClazzList(child, clazzesArray);
    });

    clazzes.forEach((clazz) => {
      clazz.instanceCount = 0;
      clazzesArray.push(clazz);
    });
  }

  function initApplication(application) {
    const { packages } = application;

    packages.forEach((child) => {
      initNodes(child);
    });

    let componentData = layoutMap.get(application.id);
    componentData.height = OPENED_COMPONENT_HEIGHT;
    componentData.width = -1.0;
    componentData.depth = -1.0;
  }

  function initNodes(component) {
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

  function getHeightOfComponent(component) {
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

  function doApplicationLayout(application) {
    const { packages } = application;

    packages.forEach((child) => {
      doLayout(child);
    });

    layoutChildrenOfApplication(application);
  }

  function layoutChildrenOfApplication(application) {
    let tempList = [];

    const { packages } = application;

    packages.forEach((child) => {
      tempList.push(child);
    });

    const segment = layoutGeneric(tempList);

    let componentData = layoutMap.get(application.id);
    componentData.width = segment.width;
    componentData.depth = segment.height;
  }

  function doLayout(component) {
    const children = component.subPackages;

    children.forEach((child) => {
      doLayout(child);
    });

    layoutChildren(component);
  }

  function layoutChildren(component) {
    let tempList = [];

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

  function layoutGeneric(children) {
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
    //rootSegment.height += INSET_SPACE;
    /*console.log('rootSegment:');
    for (let property in rootSegment) {
      if (rootSegment.hasOwnProperty(property)) {
          console.log(`${property}: ${rootSegment[property]}`);
      }
    }*/

    return rootSegment;

    function insertFittingSegment(rootSegment, toFitWidth, toFitHeight) {
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
        let resultFromUpper = null;
        let resultFromLower = null;

        if (rootSegment.upperRightChild != null) {
          resultFromUpper = insertFittingSegment(
            rootSegment.upperRightChild,
            toFitWidth,
            toFitHeight
          );
        }

        if (rootSegment.lowerChild != null) {
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

  function createRootSegment(children) {
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

  function createLayoutSegment() {
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
