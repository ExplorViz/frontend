export type ColorSchemeId = 'default' | 'classic' | 'blue' | 'dark';
export type ColorScheme = typeof defaultColors;

export const defaultColors = {
  foundationColor: '#d2d2d2', // grey
  componentOddColor: '#65c97e', // lime green
  componentEvenColor: '#3c8db0', // desaturated cyan
  clazzColor: '#a7cffb', // light pastel blue
  highlightedEntityColor: '#ff5151', // pastel red
  componentTextColor: '#ffffff', // white
  clazzTextColor: '#ffffff', // white
  foundationTextColor: '#000000', // black
  communicationColor: '#d6d48b', // dark grey
  communicationArrowColor: '#000000', // black
  backgroundColor: '#ffffff', // white
};

export const classicColors = {
  foundationColor: '#c7c7c7', // grey
  componentOddColor: '#169e2b', // dark green
  componentEvenColor: '#00bb41', // light green
  clazzColor: '#3e14a0', // purple-blue
  highlightedEntityColor: '#ff0000', // red
  componentTextColor: '#ffffff', // white
  clazzTextColor: '#ffffff', // white
  foundationTextColor: '#000000', // black
  communicationColor: '#f49100', // orange
  communicationArrowColor: '#000000', // black
  backgroundColor: '#ffffff', // white
};

export const blueColors = {
  foundationColor: '#c7c7c7', // light grey
  componentOddColor: '#015a6e', // deep teal
  componentEvenColor: '#0096be', // light blue
  clazzColor: '#f300cb', // magenta
  highlightedEntityColor: '#ff0000', // red
  componentTextColor: '#ffffff', // white
  clazzTextColor: '#ffffff', // white
  foundationTextColor: '#000000', // black
  communicationColor: '#f49100', // orange
  communicationArrowColor: '#000000', // black
  backgroundColor: '#ffffff', // white
};

export const darkColors = {
  foundationColor: '#c7c7c7', // grey
  componentOddColor: '#2f3d3b', // dark grey
  componentEvenColor: '#5B7B88', // blue-grey
  clazzColor: '#4073b6', // blue
  highlightedEntityColor: '#ff0000', // red
  componentTextColor: '#ffffff', // white
  clazzTextColor: '#ffffff', // white
  foundationTextColor: '#000000', // black
  communicationColor: '#e3e3e3', // light grey
  communicationArrowColor: '#000000', // black
  backgroundColor: '#acacac', // stone grey
};
