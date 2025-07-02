export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark';
export type ColorScheme = typeof defaultColors;

export const defaultColors = {
  backgroundColor: '#ffffff', // white
  classColor: '#a7cffb', // light pastel blue
  classTextColor: '#ffffff', // white
  communicationArrowColor: '#000000', // black
  communicationColor: '#d6d48b', // dark grey
  componentEvenColor: '#3c8db0', // desaturated cyan
  componentOddColor: '#65c97e', // lime green
  componentTextColor: '#ffffff', // white
  foundationColor: '#c7c7c7', // grey
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
};

// The following color schemes might also be partial color schemes

export const classicColors = {
  classColor: '#3e14a0', // purple-blue
  communicationColor: '#f49100', // orange
  componentEvenColor: '#00bb41', // light green
  componentOddColor: '#169e2b', // dark green
};

export const blueColors = {
  classColor: '#f300cb', // magenta
  communicationColor: '#f49100', // orange
  componentEvenColor: '#0096be', // light blue
  componentOddColor: '#015a6e', // deep teal
};

export const darkColors = {
  classColor: '#4073b6', // blue
  communicationColor: '#e3e3e3', // light grey
  componentEvenColor: '#5B7B88', // blue-grey
  componentOddColor: '#2f3d3b', // dark grey
};
