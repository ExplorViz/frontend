import { Application, StructureLandscapeData } from "./landscape-schemes/structure-data";
import { getApplicationInLandscapeById } from "./landscape-structure-helpers";

export function setApplicationName(
  landscapeStructue: StructureLandscapeData,
  id: string, name: string
) {
  var application = getApplicationInLandscapeById(landscapeStructue, id);
  
  if(application){
    application.name = name;
    return application;
  }
}

export function setApplicationInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string,
  newApplication: Application
) {
  for(let node of landscapeStructure.nodes) {
    for(let i = 0; i < node.applications.length; i++) {
      if(node.applications[i].id === id) {
        node.applications[i] = newApplication;
        return landscapeStructure;
      }
    }
  }
  return landscapeStructure;
}

