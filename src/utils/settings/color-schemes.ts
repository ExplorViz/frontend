export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark' | 'desert';
export type ColorScheme = typeof defaultColors;

export const defaultColors = {
  backgroundColor: '#ffffff', // white
  classColor: '#a7cffb', // light pastel blue
  classTextColor: '#ffffff', // white
  communicationArrowColor: '#000000', // black
  communicationColor: '#d6d48b', // light yellow
  componentRootLevelColor: '#3c8db0', // desaturated cyan
  componentDeepestLevelColor: '#65c97e', // lime green
  componentTextColor: '#ffffff', // white
  foundationColor: '#f3f3f3', // light grey
  foundationTextColor: '#000000', // black
  highlightedEntityColor: '#ff5151', // pastel red
  addedComponentColor: '#9ACD32', // light green
  removedComponentColor: '#CD5C5C', // red
  unchangedComponentColor: '#ffffff', // white
  addedClassColor: '#3CB371', // green
  modifiedClassColor: '#87CEFA', // pastel blue
  removedClassColor: '#B03060', // pastel red
  unchangedClassColor: '#000000', // black
  k8sNodeColor: '#000f6c', // midnight blue
  k8sNamespaceColor: '#0023a3', // dark blue
  k8sDeploymentColor: '#002dea', // blue
  k8sPodColor: '#0648e5', // light blue
  k8sTextColor: '#ffffff', // white
  k8sDiagramForegroundColor: '#ffffff', // white
  k8sDiagramBackgroundColor: '#326ce5', // bright blue
};

// The following color schemes might also be partial color schemes

export const classicColors = {
  classColor: '#3e14a0', // purple-blue
  communicationColor: '#f49100', // orange
  componentRootLevelColor: '#169e2b', // dark green
  componentDeepestLevelColor: '#4efa79', // light green
};

export const blueColors = {
  classColor: '#FDB882', // light orange

  componentRootLevelColor: '#031e7f', // deep teal
  componentDeepestLevelColor: '#82c7fd', // light blue
};

export const darkColors = {
  classColor: '#4073b6', // blue
  communicationColor: '#e3e3e3', // light grey
  componentRootLevelColor: '#2f3d3b', // dark grey
  componentDeepestLevelColor: '#5B7B88', // blue-grey
};

export const desertCity = {
  foundationColor: '#ffffff', // white
  classColor: '#e0e0e0', // light grey
  componentRootLevelColor: '#afbac2', // light blue-grey
  componentDeepestLevelColor: '#f2ed59', // sand yellow
};
