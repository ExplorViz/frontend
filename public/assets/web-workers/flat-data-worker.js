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

    let returnValue = [];

    for (const node of topLevelPackages) {
      returnValue = returnValue.concat(collectFqns(node));
    }

    return returnValue;

    function collectFqns(node, parentFqn) {
      let namesList = [];

      const currentName = parentFqn ? parentFqn + '.' + node.name : node.name;

      node.classes.forEach((clazz) => {
        namesList.push({
          fqn: `${currentName}.${clazz.name}`,
          className: `${clazz.name}`,
          applicationName: `${application.name}`,
        });
      });

      node.subPackages.forEach((subPack) => {
        namesList = namesList.concat(collectFqns(subPack, currentName));
      });

      return namesList;
    }
  }
}
