// Wait for the initial message event.
self.addEventListener(
  'message',
  function (e) {
    const structureData = e.data.structure;
    const dynamicData = e.data.dynamic;

    const flatData = calculateFlatData(structureData, dynamicData);

    postMessage(flatData);
  },
  false
);

// example output

//[
//  {
//    "hashcode": "123abc",
//    "fqn": "packageName1.packageName2.className.methodName",
//    "className": "className",
//    "methodName": "methodName"
//    "applicationName": "app123"
//  },
//  {
//    ...
//  }
//]

// Ping the Ember service to say that everything is ok.
postMessage(true);

/******* Define flatData *******/

function calculateFlatData(application, allLandscapeTraces) {
  return calculateStaticData(application);

  function calculateStaticData(application) {
    const topLevelPackages = application.packages;

    let returnValue = new Map();

    for (const node of topLevelPackages) {
      returnValue = new Map([...returnValue, ...collectFqns(node)]);
    }

    return returnValue;

    function collectFqns(node, parentFqn) {
      let flatDataMap = new Map();

      const currentName = parentFqn ? parentFqn + '.' + node.name : node.name;

      node.classes.forEach((clazz) => {
        clazz.methods.forEach((method) => {
          flatDataMap.set(method.methodHash, {
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
        flatDataMap = new Map([
          ...flatDataMap,
          ...collectFqns(subPack, currentName),
        ]);
      });
      return flatDataMap;
    }
  }
}
