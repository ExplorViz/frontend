// Wait for the initial message event.
self.addEventListener(
  'message',
  function (e) {
    const structureData = e.data.structure;
    const dynamicData = e.data.dynamic;

    const flatDataObject = {
      hashCodeClassMap: {},
      packageNameModelMap: {},
      fqnToModelMap: {},
    };

    flatDataObject.hashCodeClassMap = calculateHashCodeClassMap(structureData);

    flatDataObject.packageNameModelMap =
      calculatePackageNameModelMap(structureData);

    flatDataObject.fqnToModelMap = calculateFqnToModelMap(structureData);

    postMessage(flatDataObject);
  },
  false
);

// Ping the Ember service to say that everything is ok.
postMessage(true);

/******* Define flatData *******/

function calculatePackageNameModelMap(application) {
  const topLevelPackages = application.packages;

  let returnValue = new Map();

  for (const package of topLevelPackages) {
    returnValue = new Map([
      ...returnValue,
      ...calculatePackageNameModelMapForPackageAndChildren(package),
    ]);
  }

  return returnValue;

  function calculatePackageNameModelMapForPackageAndChildren(node, parentFqn) {
    let packageNameModelMap = new Map();

    const currentName = parentFqn ? parentFqn + '.' + node.name : node.name;

    packageNameModelMap.set(currentName, {
      applicationName: `${application.name}`,
      applicationModelId: `${application.id}`,
      fqn: currentName,
      modelId: node.id,
    });

    node.subPackages.forEach((subPack) => {
      packageNameModelMap = new Map([
        ...packageNameModelMap,
        ...calculatePackageNameModelMapForPackageAndChildren(
          subPack,
          currentName
        ),
      ]);
    });
    return packageNameModelMap;
  }
}

function calculateFqnToModelMap(application) {
  const topLevelPackages = application.packages;

  let returnValue = new Map();

  for (const package of topLevelPackages) {
    returnValue = new Map([
      ...returnValue,
      ...calculatePackageNameModelMapForPackageAndChildren(package),
    ]);
  }

  return returnValue;

  function calculatePackageNameModelMapForPackageAndChildren(
    subpackage,
    parentFqn
  ) {
    let packageNameModelMap = new Map();

    const currentName = parentFqn
      ? parentFqn + '.' + subpackage.name
      : subpackage.name;

    // Add the package itself
    packageNameModelMap.set(currentName, {
      applicationName: `${application.name}`,
      applicationModelId: `${application.id}`,
      fqn: currentName,
      modelId: subpackage.id,
      model: subpackage,
    });

    // Add the classes in the package
    for (const cls of subpackage.classes) {
      const classFqn = currentName + '.' + cls.name;
      packageNameModelMap.set(classFqn, {
        applicationName: `${application.name}`,
        applicationModelId: `${application.id}`,
        fqn: classFqn,
        modelId: cls.id,
        model: cls,
      });
    }

    // Recurse into subPackages
    subpackage.subPackages.forEach((subPack) => {
      packageNameModelMap = new Map([
        ...packageNameModelMap,
        ...calculatePackageNameModelMapForPackageAndChildren(
          subPack,
          currentName
        ),
      ]);
    });

    return packageNameModelMap;
  }
}

function calculateHashCodeClassMap(application) {
  const topLevelPackages = application.packages;

  let returnValue = new Map();

  for (const node of topLevelPackages) {
    returnValue = new Map([
      ...returnValue,
      ...calculateHashCodeClassMapForNode(node),
    ]);
  }

  return returnValue;

  function calculateHashCodeClassMapForNode(node, parentFqn) {
    let hashCodeClassMap = new Map();

    const currentName = parentFqn ? parentFqn + '.' + node.name : node.name;

    node.classes.forEach((clazz) => {
      clazz.methods.forEach((method) => {
        hashCodeClassMap.set(method.methodHash, {
          fqn: `${currentName}.${clazz.name}`,
          className: `${clazz.name}`,
          applicationName: `${application.name}`,
          applicationModelId: `${application.id}`,
          methodName: method.name,
          methodHash: method.methodHash,
          modelId: clazz.id,
        });
      });
    });

    node.subPackages.forEach((subPack) => {
      hashCodeClassMap = new Map([
        ...hashCodeClassMap,
        ...calculateHashCodeClassMapForNode(subPack, currentName),
      ]);
    });
    return hashCodeClassMap;
  }
}
