export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark' | 'desert';
export type ColorScheme = typeof defaultColors;

const defaultLanguageBuildingColor = '#a7cffb'; // light pastel blue

export const defaultColors = {
  backgroundColor: '#ffffff', // white
  javaBuildingColor: defaultLanguageBuildingColor,
  cBuildingColor: defaultLanguageBuildingColor,
  cppBuildingColor: defaultLanguageBuildingColor,
  csharpBuildingColor: defaultLanguageBuildingColor,
  goBuildingColor: defaultLanguageBuildingColor,
  javascriptBuildingColor: defaultLanguageBuildingColor,
  kotlinBuildingColor: defaultLanguageBuildingColor,
  phpBuildingColor: defaultLanguageBuildingColor,
  pythonBuildingColor: defaultLanguageBuildingColor,
  rustBuildingColor: defaultLanguageBuildingColor,
  swiftBuildingColor: defaultLanguageBuildingColor,
  typescriptBuildingColor: defaultLanguageBuildingColor,
  plaintextBuildingColor: defaultLanguageBuildingColor,
  otherBuildingColor: defaultLanguageBuildingColor,
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

const classicLanguageBuildingColor = '#3e14a0'; // purple-blue

// The following color schemes might also be partial color schemes

export const classicColors = {
  javaBuildingColor: classicLanguageBuildingColor,
  cBuildingColor: classicLanguageBuildingColor,
  cppBuildingColor: classicLanguageBuildingColor,
  csharpBuildingColor: classicLanguageBuildingColor,
  goBuildingColor: classicLanguageBuildingColor,
  javascriptBuildingColor: classicLanguageBuildingColor,
  kotlinBuildingColor: classicLanguageBuildingColor,
  phpBuildingColor: classicLanguageBuildingColor,
  pythonBuildingColor: classicLanguageBuildingColor,
  rustBuildingColor: classicLanguageBuildingColor,
  swiftBuildingColor: classicLanguageBuildingColor,
  typescriptBuildingColor: classicLanguageBuildingColor,
  plaintextBuildingColor: classicLanguageBuildingColor,
  otherBuildingColor: classicLanguageBuildingColor,
  communicationColor: '#f49100', // orange
  districtRootLevelColor: '#169e2b', // dark green
  districtDeepestLevelColor: '#4efa79', // light green
};

const blueLanguageBuildingColor = '#FDB882'; // light orange

export const blueColors = {
  javaBuildingColor: blueLanguageBuildingColor,
  cBuildingColor: blueLanguageBuildingColor,
  cppBuildingColor: blueLanguageBuildingColor,
  csharpBuildingColor: blueLanguageBuildingColor,
  goBuildingColor: blueLanguageBuildingColor,
  javascriptBuildingColor: blueLanguageBuildingColor,
  kotlinBuildingColor: blueLanguageBuildingColor,
  phpBuildingColor: blueLanguageBuildingColor,
  pythonBuildingColor: blueLanguageBuildingColor,
  rustBuildingColor: blueLanguageBuildingColor,
  swiftBuildingColor: blueLanguageBuildingColor,
  typescriptBuildingColor: blueLanguageBuildingColor,
  plaintextBuildingColor: blueLanguageBuildingColor,
  otherBuildingColor: blueLanguageBuildingColor,

  districtRootLevelColor: '#031e7f', // deep teal
  districtDeepestLevelColor: '#82c7fd', // light blue
};

const darkLanguageBuildingColor = '#4073b6'; // blue

export const darkColors = {
  javaBuildingColor: darkLanguageBuildingColor,
  cBuildingColor: darkLanguageBuildingColor,
  cppBuildingColor: darkLanguageBuildingColor,
  csharpBuildingColor: darkLanguageBuildingColor,
  goBuildingColor: darkLanguageBuildingColor,
  javascriptBuildingColor: darkLanguageBuildingColor,
  kotlinBuildingColor: darkLanguageBuildingColor,
  phpBuildingColor: darkLanguageBuildingColor,
  pythonBuildingColor: darkLanguageBuildingColor,
  rustBuildingColor: darkLanguageBuildingColor,
  swiftBuildingColor: darkLanguageBuildingColor,
  typescriptBuildingColor: darkLanguageBuildingColor,
  plaintextBuildingColor: darkLanguageBuildingColor,
  otherBuildingColor: darkLanguageBuildingColor,
  communicationColor: '#e3e3e3', // light grey
  districtRootLevelColor: '#2f3d3b', // dark grey
  districtDeepestLevelColor: '#5B7B88', // blue-grey
};

const desertLanguageBuildingColor = '#e0e0e0'; // light grey

export const desertCity = {
  foundationColor: '#ffffff', // white
  javaBuildingColor: desertLanguageBuildingColor,
  cBuildingColor: desertLanguageBuildingColor,
  cppBuildingColor: desertLanguageBuildingColor,
  csharpBuildingColor: desertLanguageBuildingColor,
  goBuildingColor: desertLanguageBuildingColor,
  javascriptBuildingColor: desertLanguageBuildingColor,
  kotlinBuildingColor: desertLanguageBuildingColor,
  phpBuildingColor: desertLanguageBuildingColor,
  pythonBuildingColor: desertLanguageBuildingColor,
  rustBuildingColor: desertLanguageBuildingColor,
  swiftBuildingColor: desertLanguageBuildingColor,
  typescriptBuildingColor: desertLanguageBuildingColor,
  plaintextBuildingColor: desertLanguageBuildingColor,
  otherBuildingColor: desertLanguageBuildingColor,
  districtRootLevelColor: '#afbac2', // light blue-grey
  districtDeepestLevelColor: '#f2ed59', // sand yellow
};
