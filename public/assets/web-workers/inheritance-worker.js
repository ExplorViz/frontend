self.addEventListener(
    'message',
    function (e) {
      const structureData = e.data.structure;
  
      const inheritance = applyInheritance(structureData);
      postMessage(inheritance);
    },
    false
  );
  
  // Ping the Ember service to say that everything is ok.
  postMessage(true);
  
  /******* Define Layouter *******/
  
  function applyInheritance(application) {
    const inheritanceMap = new Map(); // maps class id to list of class id's it inherits from

    const packages = application.packages;
    let values = [];
    let values2 = [];
    for(const package of packages){
      const val = getMapEntries(package, "");

      values = [...values, ...val.fqClassNameToClassId];
      values2 = [...values2, ...val.classIdToSuperClassFqn];

    }

    const helperMap = new Map(values); // maps full qualified class name to its id
    const helperMap2 = new Map(values2); // maps class id to its full qualified superclass name (even if more than one "superclass", e.g. multiple interfaces, exist), they are all provided in a csv-string
    const classIdToSuperClassId = new Map();

    helperMap2.forEach((val,key) => {



      let superClassFqn = val;
      if(val.includes("<")){
        const valSplit = val.split("<"); // generic class
        superClassFqn = valSplit[0];
      }

      const superClassId = helperMap.get(superClassFqn);

      if(superClassId){
        classIdToSuperClassId.set(key, superClassId);
      }
    });

    
    return classIdToSuperClassId;



    function getMapEntries(package, fqn) {
      let newFqn;
      if(fqn === ""){
        newFqn = package.name;
      }else {
        newFqn = fqn + "." + package.name;
      }
    
      let res = [];
      let res2 = [];
      for(let clazz of package.classes){
        res.push([newFqn + "." + clazz.name, clazz.id]);
        if(clazz.superClass){
          res2.push([clazz.id, clazz.superClass]);
        }
      }

      let resres;
      for(let subPackage of package.subPackages){
        resres = getMapEntries(subPackage, newFqn);

        res = [...res, ...resres.fqClassNameToClassId];
        res2 = [...res2, ...resres.classIdToSuperClassFqn];
      }
      return {
        fqClassNameToClassId: res, 
        classIdToSuperClassFqn: res2
      };

    }

  }