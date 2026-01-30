export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark' | 'desert';
export type ColorScheme = typeof defaultColors;

export const defaultColors = {
  backgroundColor: '#ffffff', // white
  buildingColor: '#a7cffb', // light pastel blue
  buildingTextColor: '#ffffff', // white
  communicationArrowColor: '#000000', // black
  communicationColor: '#d6d48b', // light yellow
  districtRootLevelColor: '#3c8db0', // desaturated cyan
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
};

// The following color schemes might also be partial color schemes

export const classicColors = {
  buildingColor: '#3e14a0', // purple-blue
  communicationColor: '#f49100', // orange
  districtRootLevelColor: '#169e2b', // dark green
  districtDeepestLevelColor: '#4efa79', // light green
};

export const blueColors = {
  buildingColor: '#FDB882', // light orange

  districtRootLevelColor: '#031e7f', // deep teal
  districtDeepestLevelColor: '#82c7fd', // light blue
};

export const darkColors = {
  buildingColor: '#4073b6', // blue
  communicationColor: '#e3e3e3', // light grey
  districtRootLevelColor: '#2f3d3b', // dark grey
  districtDeepestLevelColor: '#5B7B88', // blue-grey
};

export const desertCity = {
  foundationColor: '#ffffff', // white
  buildingColor: '#e0e0e0', // light grey
  districtRootLevelColor: '#afbac2', // light blue-grey
  districtDeepestLevelColor: '#f2ed59', // sand yellow
};
