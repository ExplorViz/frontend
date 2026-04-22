export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark' | 'desert';
export type ColorScheme = typeof defaultColors;

export const defaultColors = {
  backgroundColor: '#ffffff', // white
  javaBuildingColor: '#a7cffb', // light pastel blue
  cppBuildingColor: '#a7cffb',
  pythonBuildingColor: '#a7cffb',
  typescriptBuildingColor: '#a7cffb',
  otherBuildingColor: '#a7cffb',
  buildingTextColor: '#000000', // black
  communicationArrowColor: '#000000', // black
  communicationColor: '#d6d48b', // light yellow
  communicationStartColor: '#00ff00', // green
  communicationEndColor: '#ff0000', // red
  districtRootLevelColor: '#3c8db0', // unsaturated cyan
  districtDeepestLevelColor: '#65c97e', // lime green
  districtTextColor: '#ffffff', // white
  foundationColor: '#f3f3f3', // light grey
  foundationTextColor: '#000000', // black
  highlightedEntityColor: '#ff5151', // pastel red
  addedDistrictColor: '#9ACD32', // light green
  removedDistrictColor: '#CD5C5C', // red
  unchangedDistrictColor: '#ffffff', // white
  addedBuildingColor: '#3CB371', // green
  modifiedBuildingColor: '#87CEFA', // pastel blue
  removedBuildingColor: '#B03060', // pastel red
  unchangedBuildingColor: '#000000', // black
  k8sDiagramColor: '#326ce5', // bright blue
};

// The following color schemes might also be partial color schemes

export const classicColors = {
  javaBuildingColor: '#3e14a0', // purple-blue
  cppBuildingColor: '#3e14a0',
  pythonBuildingColor: '#3e14a0',
  typescriptBuildingColor: '#3e14a0',
  otherBuildingColor: '#3e14a0',
  communicationColor: '#f49100', // orange
  districtRootLevelColor: '#169e2b', // dark green
  districtDeepestLevelColor: '#4efa79', // light green
};

export const blueColors = {
  javaBuildingColor: '#FDB882', // light orange
  cppBuildingColor: '#FDB882',
  pythonBuildingColor: '#FDB882',
  typescriptBuildingColor: '#FDB882',
  otherBuildingColor: '#FDB882',

  districtRootLevelColor: '#031e7f', // deep teal
  districtDeepestLevelColor: '#82c7fd', // light blue
};

export const darkColors = {
  javaBuildingColor: '#4073b6', // blue
  cppBuildingColor: '#4073b6',
  pythonBuildingColor: '#4073b6',
  typescriptBuildingColor: '#4073b6',
  otherBuildingColor: '#4073b6',
  communicationColor: '#e3e3e3', // light grey
  districtRootLevelColor: '#2f3d3b', // dark grey
  districtDeepestLevelColor: '#5B7B88', // blue-grey
};

export const desertCity = {
  foundationColor: '#ffffff', // white
  javaBuildingColor: '#e0e0e0', // light grey
  cppBuildingColor: '#e0e0e0',
  pythonBuildingColor: '#e0e0e0',
  typescriptBuildingColor: '#e0e0e0',
  otherBuildingColor: '#e0e0e0',
  districtRootLevelColor: '#afbac2', // light blue-grey
  districtDeepestLevelColor: '#f2ed59', // sand yellow
};
